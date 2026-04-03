import sys
import asyncio
import logging
from typing import List, Dict, Any
from crawl4ai import AsyncWebCrawler, CrawlerRunConfig, CacheMode, BrowserConfig
from crawl4ai.deep_crawling import BFSDeepCrawlStrategy

# Fix for Playwright/asyncio NotImplementedError on Windows
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def scrape_single_source(crawler: AsyncWebCrawler, url: str, max_pages: int) -> List[Dict[str, Any]]:
    """
    Scrapes a single root URL with a specific page limit using BFS deep crawling.
    """
    logger.info(f"Starting BFS crawl for {url} with max_pages={max_pages}")
    
    # Configure deep crawl strategy for this specific URL
    strategy = BFSDeepCrawlStrategy(
        max_depth=2,  # Reasonable default depth
        max_pages=max_pages+1
    )
    
    config = CrawlerRunConfig(
        deep_crawl_strategy=strategy,
        cache_mode=CacheMode.BYPASS,
        verbose=True,
        magic=True
    )
    
    try:
        # Perform the crawl
        results = await crawler.arun(url=url, config=config)
        
        scraped_data = []
        # If BFS returns a list of results (one per page)
        if isinstance(results, list):
            for res in results:
                if res.success:
                    scraped_data.append({
                        "url": res.url,
                        "content": res.markdown or res.cleansed_html or "",
                        "metadata": res.metadata or {}
                    })
        else:
            # Single result case
            if results.success:
                scraped_data.append({
                    "url": results.url,
                    "content": results.markdown or results.cleansed_html or "",
                    "metadata": results.metadata or {}
                })
                
        logger.info(f"Finished crawl for {url}. Found {len(scraped_data)} pages.")
        return scraped_data
        
    except Exception as e:
        logger.error(f"Error crawling {url}: {str(e)}")
        return []

async def run_multi_link_scraper(url_configs: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Main entry point to scrape multiple links concurrently.
    url_configs: List of {"url": str, "pages": int}
    """
    all_results = []
    scrapped_urls = set()  # Track unique URLs to avoid duplicates
    # Define the browser configuration
    browser_config = BrowserConfig(
        headless=True,
        enable_stealth=True,  # Handles most anti-detection flags automatically
        extra_args=[
            "--disable-gpu",
            "--disable-dev-shm-usage",
            "--no-sandbox",
            "--blink-settings=imagesEnabled=false"  # Efficiently disables images
        ]
    )
    
    async with AsyncWebCrawler(config=browser_config) as crawler:
        # Create tasks for each URL config
        tasks = [
            scrape_single_source(crawler, config["url"], config["pages"])
            for config in url_configs
        ]
        
        # Run all crawls in parallel
        results_nested = await asyncio.gather(*tasks)
        
        # Flatten results and filter by unique URL
        for site_results in results_nested:
            for res in site_results:
                url = res.get("url")
                if url and url not in scrapped_urls:
                    scrapped_urls.add(url)
                    all_results.append(res)
            
    return all_results

