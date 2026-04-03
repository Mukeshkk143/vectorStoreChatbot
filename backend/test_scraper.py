import asyncio
import sys
import os

# Add the project root to the path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

try:
    from utils.scraper import run_multi_link_scraper
except ImportError as e:
    print(f"Error: Could not import run_multi_link_scraper. Ensure you're in the backend directory. {e}")
    sys.exit(1)

async def main():
    print("🚀 Starting scraper verification test...")
    
    # Test configurations
    test_configs = [
        {"url": "https://www.koodums.com/", "pages": 5}
    ]
    
    try:
        print(f"📡 Scraping {len(test_configs)} test URLs...")
        results = await run_multi_link_scraper(test_configs)
        
        print("\n✅ Verification Results:")
        print(f"Total results: {len(results)}")
        
        for i, res in enumerate(results):
            url = res.get("url", "N/A")
            content_len = len(res.get("content", ""))
            print(f"{i+1}. URL: {url} | Content Length: {content_len} bytes")
            
        if len(results) > 0:
            print("\n🎉 Scraper is working correctly!" , results[:1])
        else:
            print("\n⚠️ No results returned. Check connectivity or crawl4ai setup.")
            
    except Exception as e:
        print(f"\n❌ Error during scraper execution: {str(e)}")
        print("\n💡 Note: You may need to run 'playwright install' if it's your first time using Crawl4AI.")

if __name__ == "__main__":
    asyncio.run(main())
