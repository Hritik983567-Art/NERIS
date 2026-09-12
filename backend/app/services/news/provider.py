import time
import logging
import urllib.request
import urllib.parse
import xml.etree.ElementTree as ET
import asyncio
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any, Tuple

from app.services.news.base import BaseNewsProvider, NERISNewsArticle, NewsCategory, SeverityLevel
from app.services.news.normalizer import normalize_article_record

logger = logging.getLogger("neris.news.provider")

SEARCH_TOPICS = [
    # English Topics
    {"query": "North East India highway landslide disaster", "default_location": "ASSAM", "hl": "en-IN", "ceid": "IN:en"},
    {"query": "Meghalaya NH-06 weather blockade highway", "default_location": "MEGHALAYA", "hl": "en-IN", "ceid": "IN:en"},
    {"query": "Assam BRO road clearance flood logistics", "default_location": "ASSAM", "hl": "en-IN", "ceid": "IN:en"},
    {"query": "Manipur Imphal NH-02 traffic advisory mudslide", "default_location": "MANIPUR", "hl": "en-IN", "ceid": "IN:en"},
    {"query": "Mizoram NH-54 Aizawl weather emergency alert", "default_location": "MIZORAM", "hl": "en-IN", "ceid": "IN:en"},
    {"query": "Tripura Agartala highway infrastructure rail", "default_location": "TRIPURA", "hl": "en-IN", "ceid": "IN:en"},
    {"query": "Sikkim Teesta highway landslide NH-10", "default_location": "SIKKIM", "hl": "en-IN", "ceid": "IN:en"},
    {"query": "Arunachal Pradesh border road BRO Sela pass", "default_location": "ARUNACHAL PRADESH", "hl": "en-IN", "ceid": "IN:en"},
    {"query": "Nagaland Dimapur Kohima NH-29 road condition", "default_location": "NAGALAND", "hl": "en-IN", "ceid": "IN:en"},

    # Hindi Topics
    {"query": "पूर्वोत्तर भारत भूस्खलन बारिश बाढ़ राजमार्ग", "default_location": "ASSAM", "hl": "hi", "ceid": "IN:hi"},
    {"query": "असम गुवाहाटी भूस्खलन सड़क मार्ग अलर्ट", "default_location": "ASSAM", "hl": "hi", "ceid": "IN:hi"},
    {"query": "अरुणाचल प्रदेश बार्डर रोड भूस्खलन तवांग", "default_location": "ARUNACHAL PRADESH", "hl": "hi", "ceid": "IN:hi"},
    {"query": "मणिपुर इंफाल हाइवे भूस्खलन बंद", "default_location": "MANIPUR", "hl": "hi", "ceid": "IN:hi"},

    # Bengali Topics
    {"query": "উত্তর পূর্ব ভারত বন্যা ধস হাইওয়ে রাস্তা বন্ধ", "default_location": "TRIPURA", "hl": "bn", "ceid": "IN:bn"},
    {"query": "অরুণাচল ত্রিপুরা বন্যা সড়ক যোগাযোগ ধস", "default_location": "TRIPURA", "hl": "bn", "ceid": "IN:bn"},
    {"query": "সিকিম তিস্তা নদী বন্যা জাতীয় সড়ক ধস", "default_location": "SIKKIM", "hl": "bn", "ceid": "IN:bn"},

    # Assamese Topics
    {"query": "Assam Guwahati flood highway landslide news", "default_location": "ASSAM", "hl": "en-IN", "ceid": "IN:en"},

    # Manipuri Topics
    {"query": "Manipur Imphal Jiribam road landslide traffic", "default_location": "MANIPUR", "hl": "en-IN", "ceid": "IN:en"}
]

DEMO_SEED_ARTICLES = [
    {
        "title": "Sela Pass High-Altitude Landslide: NH-13 Blocked Near Tawang Junction",
        "summary": "Border Roads Organisation (BRO) Project Vartak dozers deployed at Sela Tunnel approach following heavy midnight rockfalls. Emergency medical convoys rerouted via Bhalukpong corridor.",
        "category": NewsCategory.LANDSLIDE.value,
        "source": "BRO Project Vartak Command Bulletin",
        "source_url": "https://bro.gov.in/advisories/sela-pass-nh13-landslide",
        "published_at": "24 mins ago",
        "location": "ARUNACHAL PRADESH",
        "severity": SeverityLevel.CRITICAL.value,
        "image_url": "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80"
    },
    {
        "title": "Teesta River Flood Advisory: NH-10 Rangpo-Rorathang Stretch Damaged",
        "summary": "Continuous torrential cloudbursts in North Sikkim caused water level rise along Teesta river basin. BRO Project Swastik excavators deployed for rapid mud and boulder clearance.",
        "category": NewsCategory.FLOOD.value,
        "source": "Sikkim State Disaster Management Authority",
        "source_url": "https://sdsma.sikkim.gov.in/alerts/teesta-flood-nh10",
        "published_at": "1 hour ago",
        "location": "SIKKIM",
        "severity": SeverityLevel.CRITICAL.value,
        "image_url": "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80"
    },
    {
        "title": "Cherrapunji & Dawki Highway Tourist Advisory: Heavy Monsoon Fog & Visiblity Alert",
        "summary": "IMD Shillong issues Class-A visibility alert for East Khasi Hills. Drivers advised to avoid post-17:00 hrs transit between Shillong and Sohra corridor.",
        "category": NewsCategory.WEATHER.value,
        "source": "IMD Regional Met Centre Shillong",
        "source_url": "https://mausam.imd.gov.in/shillong/fog-advisory-khasi",
        "published_at": "2 hours ago",
        "location": "MEGHALAYA",
        "severity": SeverityLevel.HIGH.value,
        "image_url": "https://images.unsplash.com/photo-1428592953211-077101b2021b?auto=format&fit=crop&w=800&q=80"
    },
    {
        "title": "Guwahati FCI Central Depot Dispatches 40 Cold-Chain Vaccine & Grain Convoys",
        "summary": "Essential cold-chain vaccines and fortified grains moving under satellite tracking via Silchar and Tezpur entry corridors for Mizoram, Tripura, and Manipur buffer stocks.",
        "category": NewsCategory.LOGISTICS.value,
        "source": "Food Corporation of India Zonal Directorate",
        "source_url": "https://fci.gov.in/press/ner-coldchain-dispatch-2026",
        "published_at": "3 hours ago",
        "location": "ASSAM",
        "severity": SeverityLevel.LOW.value,
        "image_url": "https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&w=800&q=80"
    },
    {
        "title": "Imphal-Dimapur Lifeline NH-2 Mudslide: Single Lane Traffic Regulated",
        "summary": "Sustained monsoon rain along Senapati district corridor causes slope failure. Manipur Highway Police regulating convoy transit on alternating 30-minute intervals.",
        "category": NewsCategory.ROAD_TRANSPORT.value,
        "source": "Manipur Highway Safety & Transport Cell",
        "source_url": "https://manipur.gov.in/transport/nh2-senapati-traffic-advisory",
        "published_at": "4 hours ago",
        "location": "MANIPUR",
        "severity": SeverityLevel.MODERATE.value,
        "image_url": "https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=800&q=80"
    },
    {
        "title": "Dimapur-Kohima NH-29 Ridge Pass Stabilization Clears Heavy Freight",
        "summary": "NHIDCL emergency engineering crew completes gabion wall reinforcement at Chumukedima landslide stretch, restoring heavy truck access between Dimapur railhead and Kohima.",
        "category": NewsCategory.INFRASTRUCTURE.value,
        "source": "NHIDCL Nagaland Command Office",
        "source_url": "https://nhidcl.com/updates/nh29-chumukedima-stabilization",
        "published_at": "5 hours ago",
        "location": "NAGALAND",
        "severity": SeverityLevel.MODERATE.value,
        "image_url": "https://images.unsplash.com/photo-1581094794329-c8112a89af12?auto=format&fit=crop&w=800&q=80"
    },
    {
        "title": "Dharmanagar-Agartala Railhead Freight Logistics Dispatch Operational",
        "summary": "Multimodal petroleum and essential grains dispatch operational between Dharmanagar goods yard and Agartala central buffer depots via NH-08 corridor.",
        "category": NewsCategory.EMERGENCY_RESPONSE.value,
        "source": "Northeast Frontier Railway Logistics Cell",
        "source_url": "https://nfr.indianrailways.gov.in/freight/agartala-dispatch-update",
        "published_at": "6 hours ago",
        "location": "TRIPURA",
        "severity": SeverityLevel.LOW.value,
        "image_url": "https://images.unsplash.com/photo-1474487548417-781cb71495f3?auto=format&fit=crop&w=800&q=80"
    },
    {
        "title": "Aizawl NH-54 Slope Security Advisory Issued for Heavy Commercial Fleets",
        "summary": "Mizoram Public Works Department releases transit advisory for Kolasib-Aizawl stretch following torrential downpour and active mud slips.",
        "category": NewsCategory.GOVERNMENT_ADVISORY.value,
        "source": "Mizoram PWD Disaster Response Cell",
        "source_url": "https://pwd.mizoram.gov.in/notices/nh54-aizawl-transit-advisory",
        "published_at": "7 hours ago",
        "location": "MIZORAM",
        "severity": SeverityLevel.HIGH.value,
        "image_url": "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80"
    }
]


def _fetch_single_topic(topic: Dict[str, str], retrieved_at: str) -> List[NERISNewsArticle]:
    query_str = topic["query"]
    encoded_query = urllib.parse.quote(query_str)
    hl = topic.get("hl", "en-IN")
    ceid = topic.get("ceid", "IN:en")
    rss_url = f"https://news.google.com/rss/search?q={encoded_query}&hl={hl}&gl=IN&ceid={ceid}"
    fetched: List[NERISNewsArticle] = []

    try:
        req = urllib.request.Request(
            rss_url,
            headers={'User-Agent': 'NERIS-DisasterLogisticsEngine/3.0'}
        )
        with urllib.request.urlopen(req, timeout=8.0) as response:
            xml_data = response.read()
            root = ET.fromstring(xml_data)

            for item in root.findall('.//item')[:4]:
                raw_title = item.findtext('title', 'Northeast Logistics Alert')
                parts = raw_title.rsplit(' - ', 1)
                clean_title = parts[0].strip()
                publisher_name = parts[1].strip() if len(parts) > 1 else "External Regional Media"

                source_node = item.find('source')
                if source_node is not None and source_node.text and source_node.text.strip():
                    publisher_name = source_node.text.strip()

                link = item.findtext('link') or rss_url
                pub_date = item.findtext('pubDate', retrieved_at)
                description_raw = item.findtext('description', '')

                clean_summary = description_raw
                if publisher_name in clean_summary:
                    clean_summary = clean_summary.replace(publisher_name, '').strip()
                if clean_title in clean_summary:
                    clean_summary = clean_summary.replace(clean_title, '').strip()
                if len(clean_summary) < 15:
                    clean_summary = f"Regional disaster & logistics update published by {publisher_name} regarding {clean_title}."

                article = normalize_article_record(
                    title=clean_title,
                    summary=clean_summary,
                    source=publisher_name,
                    source_url=link,
                    published_at=pub_date,
                    retrieved_at=retrieved_at,
                    location=topic["default_location"],
                    is_demo=False
                )
                fetched.append(article)
    except Exception as err:
        logger.warning(f"Live RSS Provider query error for '{query_str}': {err}")

    return fetched


class LiveRSSNewsProvider(BaseNewsProvider):
    def __init__(self):
        super().__init__("Google News & BRO Regional Live RSS Provider")

    async def fetch_articles(
        self,
        location_filter: Optional[str] = None,
        category_filter: Optional[str] = None,
        force_refresh: bool = False
    ) -> List[NERISNewsArticle]:
        retrieved_at = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        seen_keys = set()
        articles: List[NERISNewsArticle] = []

        # Run all topic RSS queries concurrently using asyncio.to_thread
        tasks = [asyncio.to_thread(_fetch_single_topic, topic, retrieved_at) for topic in SEARCH_TOPICS]
        results = await asyncio.gather(*tasks)

        for topic_articles in results:
            for art in topic_articles:
                if art.id not in seen_keys:
                    seen_keys.add(art.id)
                    articles.append(art)
                    # Persist normalized news article to AWS DynamoDB table ('ner_news_articles')
                    try:
                        from app.adapters.aws_dynamodb import get_dynamodb_adapter
                        get_dynamodb_adapter().save_news_article(art.dict())
                    except Exception as db_err:
                        logger.warning(f"Failed to persist article '{art.id}' to DynamoDB: {db_err}")

        return articles


class DemoNewsProvider(BaseNewsProvider):
    def __init__(self):
        super().__init__("NERIS Hackathon Demo Seed Provider")

    async def fetch_articles(
        self,
        location_filter: Optional[str] = None,
        category_filter: Optional[str] = None,
        force_refresh: bool = False
    ) -> List[NERISNewsArticle]:
        retrieved_at = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        articles: List[NERISNewsArticle] = []

        for item in DEMO_SEED_ARTICLES:
            art = normalize_article_record(
                title=item["title"],
                summary=item["summary"],
                source=item["source"],
                source_url=item["source_url"],
                published_at=item["published_at"],
                retrieved_at=retrieved_at,
                location=item["location"],
                category=item["category"],
                severity=item["severity"],
                image_url=item["image_url"],
                is_demo=True
            )
            articles.append(art)
            try:
                from app.adapters.aws_dynamodb import get_dynamodb_adapter
                get_dynamodb_adapter().save_news_article(art.dict())
            except Exception:
                pass

        return articles


class NewsServiceManager:
    def __init__(self):
        self.live_provider = LiveRSSNewsProvider()
        self.demo_provider = DemoNewsProvider()

        self._cached_articles: List[NERISNewsArticle] = []
        self._last_retrieved_at: Optional[str] = None
        self._last_fetch_timestamp: float = 0.0
        self._cache_ttl_seconds: float = 18000.0  # 5 hours cache TTL
        self._provider_status: str = "INITIALIZING"
        self._is_live_available: bool = False

    async def get_news_feed(
        self,
        category: Optional[str] = None,
        location: Optional[str] = None,
        severity: Optional[str] = None,
        q: Optional[str] = None,
        sort_by: Optional[str] = "relevance",
        force_demo: bool = False,
        force_refresh: bool = False
    ) -> Dict[str, Any]:
        now = time.time()
        retrieved_at_str = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

        # Use cache if fresh and not forcing refresh
        is_cached = False
        if not force_refresh and self._cached_articles and (now - self._last_fetch_timestamp < self._cache_ttl_seconds):
            articles = list(self._cached_articles)
            is_cached = True
        else:
            if force_demo:
                articles = await self.demo_provider.fetch_articles()
                self._provider_status = "DEMO_MODE"
                self._is_live_available = True
            else:
                live_articles = await self.live_provider.fetch_articles()
                if live_articles and len(live_articles) > 0:
                    articles = live_articles
                    self._provider_status = "LIVE_EXTERNAL_FEED"
                    self._is_live_available = True
                else:
                    # If live provider is completely unreachable, return empty list or fallback notice
                    articles = []
                    self._provider_status = "UNAVAILABLE"
                    self._is_live_available = False

            self._cached_articles = articles
            self._last_fetch_timestamp = now
            self._last_retrieved_at = retrieved_at_str

        # Filter logic
        filtered = []
        for art in articles:
            # 1. Location filter
            if location and location.upper() != "ALL NER" and location.upper() != "ALL":
                if art.location.upper() != location.upper() and art.location.upper() != "ALL NER":
                    continue

            # 2. Category filter
            if category and category.upper() != "ALL":
                if art.category.upper() != category.upper():
                    continue

            # 3. Severity filter
            if severity and severity.upper() != "ALL":
                if art.severity.upper() != severity.upper():
                    continue

            # 4. Search query filter
            if q and q.strip() != "":
                query_term = q.strip().lower()
                title_match = query_term in art.title.lower()
                summary_match = query_term in art.summary.lower()
                source_match = query_term in art.source.lower()
                location_match = query_term in art.location.lower()
                category_match = query_term in art.category.lower()
                if not (title_match or summary_match or source_match or location_match or category_match):
                    continue

            filtered.append(art)

        # Filter out low-relevance out-of-region noise when running live provider
        if not force_demo:
            filtered = [art for art in filtered if art.relevance_score >= 25.0]

        # Sorting logic
        if sort_by == "newest":
            filtered.sort(key=lambda x: x.published_timestamp, reverse=True)
        elif sort_by == "severity":
            sev_rank = {SeverityLevel.CRITICAL.value: 4, SeverityLevel.HIGH.value: 3, SeverityLevel.MODERATE.value: 2, SeverityLevel.LOW.value: 1}
            filtered.sort(key=lambda x: (sev_rank.get(x.severity, 0), x.relevance_score, x.published_timestamp), reverse=True)
        else:  # relevance
            filtered.sort(key=lambda x: (x.relevance_score, x.published_timestamp), reverse=True)

        return {
            "status": "SUCCESS",
            "provider_status": self._provider_status,
            "is_live_available": self._is_live_available,
            "is_cached": is_cached,
            "retrieved_at": self._last_retrieved_at or retrieved_at_str,
            "total_count": len(filtered),
            "articles": filtered
        }

    async def get_article_by_id(self, article_id: str) -> Optional[NERISNewsArticle]:
        for art in self._cached_articles:
            if art.id == article_id:
                return art

        # Search demo articles as fallback
        demo_articles = await self.demo_provider.fetch_articles()
        for art in demo_articles:
            if art.id == article_id:
                return art

        return None


_news_service_manager_instance: Optional[NewsServiceManager] = None

def get_news_service_manager() -> NewsServiceManager:
    global _news_service_manager_instance
    if _news_service_manager_instance is None:
        _news_service_manager_instance = NewsServiceManager()
    return _news_service_manager_instance
