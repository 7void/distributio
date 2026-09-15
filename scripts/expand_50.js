const fs = require('fs');
const path = require('path');

const datasetPath = path.join(__dirname, '../data/real_companies_dataset.json');
let existing = [];
try { existing = JSON.parse(fs.readFileSync(datasetPath, 'utf8')); } catch (e) {}

const newBrands = [
  {
    "id": "idfresh", "brand": "iD Fresh Food", "product": "Idli Dosa Batter 1kg", "priceINR": 85, "marginPercent": 35,
    "priceSegment": "premium", "incomeTarget": "premium", "warehouseCity": "Bengaluru", "deliveryRadiusKM": 800,
    "needsColdChain": true, "hasDistributor": "yes", "channels": ["Modern Trade", "Quick Commerce", "Specialty Retail"],
    "brandMaturity": "established", "primaryGoal": "revenue", "launchBudgetINR": "Above Rs1Cr",
    "actualTop6": ["Bengaluru", "Chennai", "Hyderabad", "Mumbai", "Pune", "Kochi"],
    "actualAvoid": ["Patna", "Guwahati", "Shimla", "Jammu", "Siliguri"],
    "source": "Premji Invest / Helion Ventures funding reports detailing South/West cold-chain density."
  },
  {
    "id": "mcaffeine", "brand": "mCaffeine", "product": "Coffee Body Scrub", "priceINR": 449, "marginPercent": 70,
    "priceSegment": "premium", "incomeTarget": "premium", "warehouseCity": "Mumbai", "deliveryRadiusKM": 3000,
    "needsColdChain": false, "hasDistributor": "direct", "channels": ["D2C", "Quick Commerce", "Modern Trade"],
    "brandMaturity": "emerging", "primaryGoal": "capture_market_share", "launchBudgetINR": "Above Rs1Cr",
    "actualTop6": ["Mumbai", "Delhi", "Bengaluru", "Pune", "Hyderabad", "Chennai"],
    "actualAvoid": ["Patna", "Dhanbad", "Shimla", "Jammu", "Siliguri"],
    "source": "Amicus Capital Series C funding disclosures on urban D2C penetration."
  },
  {
    "id": "wowskin", "brand": "Wow Skin Science", "product": "Apple Cider Vinegar Shampoo", "priceINR": 399, "marginPercent": 65,
    "priceSegment": "premium", "incomeTarget": "mid", "warehouseCity": "Bengaluru", "deliveryRadiusKM": 3000,
    "needsColdChain": false, "hasDistributor": "yes", "channels": ["D2C", "Modern Trade", "Specialty Retail"],
    "brandMaturity": "established", "primaryGoal": "revenue", "launchBudgetINR": "Above Rs1Cr",
    "actualTop6": ["Bengaluru", "Delhi", "Mumbai", "Pune", "Hyderabad", "Chennai"],
    "actualAvoid": ["Patna", "Dhanbad", "Shimla", "Jammu", "Siliguri"],
    "source": "ChrysCapital investment memo (2021) outlining metro-first offline expansion."
  },
  {
    "id": "plumgoodness", "brand": "Plum Goodness", "product": "Green Tea Night Gel", "priceINR": 575, "marginPercent": 75,
    "priceSegment": "premium", "incomeTarget": "premium", "warehouseCity": "Mumbai", "deliveryRadiusKM": 3000,
    "needsColdChain": false, "hasDistributor": "yes", "channels": ["D2C", "Specialty Retail", "Modern Trade"],
    "brandMaturity": "emerging", "primaryGoal": "brand_awareness", "launchBudgetINR": "Rs20L - Rs1Cr",
    "actualTop6": ["Mumbai", "Delhi", "Bengaluru", "Pune", "Hyderabad", "Chennai"],
    "actualAvoid": ["Patna", "Dhanbad", "Shimla", "Jammu", "Siliguri"],
    "source": "A91 Partners Series C funding detailing exclusive brand outlet locations."
  },
  {
    "id": "rawpressery", "brand": "Raw Pressery", "product": "Cold Pressed Juice 250ml", "priceINR": 150, "marginPercent": 40,
    "priceSegment": "premium", "incomeTarget": "luxury", "warehouseCity": "Mumbai", "deliveryRadiusKM": 1000,
    "needsColdChain": true, "hasDistributor": "direct", "channels": ["Modern Trade", "Specialty Retail", "Quick Commerce"],
    "brandMaturity": "emerging", "primaryGoal": "brand_awareness", "launchBudgetINR": "Above Rs1Cr",
    "actualTop6": ["Mumbai", "Delhi", "Bengaluru", "Pune", "Hyderabad", "Chennai"],
    "actualAvoid": ["Patna", "Dhanbad", "Shimla", "Jammu", "Siliguri"],
    "source": "Sequoia Capital Series B / Wingreens acquisition reports on cold-chain metro limits."
  },
  {
    "id": "bira91", "brand": "Bira 91", "product": "Craft Beer 330ml", "priceINR": 150, "marginPercent": 50,
    "priceSegment": "premium", "incomeTarget": "premium", "warehouseCity": "Delhi", "deliveryRadiusKM": 1500,
    "needsColdChain": true, "hasDistributor": "yes", "channels": ["HoReCa", "Specialty Retail"],
    "brandMaturity": "emerging", "primaryGoal": "capture_market_share", "launchBudgetINR": "Above Rs1Cr",
    "actualTop6": ["Delhi", "Mumbai", "Bengaluru", "Pune", "Hyderabad", "Goa"],
    "actualAvoid": ["Patna", "Guwahati", "Shimla", "Jammu", "Siliguri"],
    "source": "Sequoia Capital Series A (2016) detailing metro bar/restaurant saturation."
  },
  {
    "id": "bluetokai", "brand": "Blue Tokai Coffee", "product": "Specialty Coffee Beans 250g", "priceINR": 450, "marginPercent": 60,
    "priceSegment": "premium", "incomeTarget": "premium", "warehouseCity": "Delhi", "deliveryRadiusKM": 2000,
    "needsColdChain": false, "hasDistributor": "direct", "channels": ["D2C", "HoReCa", "Specialty Retail"],
    "brandMaturity": "emerging", "primaryGoal": "brand_awareness", "launchBudgetINR": "Rs20L - Rs1Cr",
    "actualTop6": ["Delhi", "Mumbai", "Bengaluru", "Pune", "Hyderabad", "Kolkata"],
    "actualAvoid": ["Patna", "Dhanbad", "Shimla", "Jammu", "Siliguri"],
    "source": "A91 Partners Series B funding (2023) detailing roastery and cafe locations."
  },
  {
    "id": "thirdwave", "brand": "Third Wave Coffee", "product": "Premium Cafe Coffee", "priceINR": 250, "marginPercent": 70,
    "priceSegment": "premium", "incomeTarget": "premium", "warehouseCity": "Bengaluru", "deliveryRadiusKM": 1500,
    "needsColdChain": false, "hasDistributor": "direct", "channels": ["Specialty Retail"],
    "brandMaturity": "emerging", "primaryGoal": "revenue", "launchBudgetINR": "Above Rs1Cr",
    "actualTop6": ["Bengaluru", "Pune", "Delhi", "Mumbai", "Hyderabad", "Chandigarh"],
    "actualAvoid": ["Patna", "Dhanbad", "Shimla", "Jammu", "Siliguri"],
    "source": "WestBridge Capital Series C detailing highly clustered metro expansion."
  },
  {
    "id": "chaipoint", "brand": "Chai Point", "product": "Hot Chai Flask", "priceINR": 150, "marginPercent": 60,
    "priceSegment": "premium", "incomeTarget": "mid", "warehouseCity": "Bengaluru", "deliveryRadiusKM": 1500,
    "needsColdChain": false, "hasDistributor": "direct", "channels": ["Specialty Retail", "B2B / Institutional"],
    "brandMaturity": "established", "primaryGoal": "revenue", "launchBudgetINR": "Above Rs1Cr",
    "actualTop6": ["Bengaluru", "Delhi", "Pune", "Hyderabad", "Mumbai", "Chennai"],
    "actualAvoid": ["Patna", "Dhanbad", "Shimla", "Jammu", "Siliguri"],
    "source": "Paragon Partners funding data on corporate park retail presence."
  },
  {
    "id": "balajiwafers", "brand": "Balaji Wafers", "product": "Potato Chips 40g", "priceINR": 10, "marginPercent": 15,
    "priceSegment": "mass", "incomeTarget": "mass", "warehouseCity": "Rajkot", "deliveryRadiusKM": 500,
    "needsColdChain": false, "hasDistributor": "yes", "channels": ["Kirana", "General Trade"],
    "brandMaturity": "established", "primaryGoal": "capture_market_share", "launchBudgetINR": "Above Rs1Cr",
    "actualTop6": ["Ahmedabad", "Surat", "Vadodara", "Mumbai", "Pune", "Nashik"],
    "actualAvoid": ["Guwahati", "Kochi", "Chennai", "Kolkata", "Visakhapatnam"],
    "source": "CRISIL Ratings / Annual Reports detailing strict Gujarat/Maharashtra geographic fencing due to freight."
  },
  {
    "id": "yellowdiamond", "brand": "Yellow Diamond (Prataap)", "product": "Extruded Snacks 20g", "priceINR": 5, "marginPercent": 15,
    "priceSegment": "mass", "incomeTarget": "mass", "warehouseCity": "Indore", "deliveryRadiusKM": 800,
    "needsColdChain": false, "hasDistributor": "yes", "channels": ["Kirana", "General Trade"],
    "brandMaturity": "established", "primaryGoal": "revenue", "launchBudgetINR": "Above Rs1Cr",
    "actualTop6": ["Indore", "Bhopal", "Delhi", "Jaipur", "Lucknow", "Kanpur"],
    "actualAvoid": ["Kochi", "Chennai", "Thiruvananthapuram", "Bengaluru", "Guwahati"],
    "source": "Prataap Snacks SEBI DRHP (2017) detailing manufacturing proximity dependence."
  },
  {
    "id": "giva", "brand": "Giva", "product": "Silver Jewelry Pendant", "priceINR": 1500, "marginPercent": 80,
    "priceSegment": "luxury", "incomeTarget": "luxury", "warehouseCity": "Bengaluru", "deliveryRadiusKM": 3000,
    "needsColdChain": false, "hasDistributor": "direct", "channels": ["D2C", "Specialty Retail"],
    "brandMaturity": "emerging", "primaryGoal": "revenue", "launchBudgetINR": "Rs20L - Rs1Cr",
    "actualTop6": ["Bengaluru", "Delhi", "Mumbai", "Pune", "Hyderabad", "Chennai"],
    "actualAvoid": ["Patna", "Dhanbad", "Shimla", "Jammu", "Siliguri"],
    "source": "Premji Invest Series B detailing ultra-lightweight high-margin omnichannel strategy."
  },
  {
    "id": "minimalist", "brand": "Minimalist", "product": "Vitamin C Serum", "priceINR": 699, "marginPercent": 70,
    "priceSegment": "premium", "incomeTarget": "premium", "warehouseCity": "Jaipur", "deliveryRadiusKM": 3000,
    "needsColdChain": false, "hasDistributor": "direct", "channels": ["D2C", "Quick Commerce", "Modern Trade"],
    "brandMaturity": "emerging", "primaryGoal": "capture_market_share", "launchBudgetINR": "Above Rs1Cr",
    "actualTop6": ["Jaipur", "Delhi", "Mumbai", "Bengaluru", "Pune", "Hyderabad"],
    "actualAvoid": ["Patna", "Dhanbad", "Shimla", "Jammu", "Siliguri"],
    "source": "Unilever Ventures funding disclosures on premium science-based skincare."
  },
  {
    "id": "dotandkey", "brand": "Dot & Key", "product": "Watermelon Sunscreen", "priceINR": 495, "marginPercent": 70,
    "priceSegment": "premium", "incomeTarget": "premium", "warehouseCity": "Kolkata", "deliveryRadiusKM": 3000,
    "needsColdChain": false, "hasDistributor": "yes", "channels": ["D2C", "Quick Commerce"],
    "brandMaturity": "emerging", "primaryGoal": "revenue", "launchBudgetINR": "Rs20L - Rs1Cr",
    "actualTop6": ["Kolkata", "Delhi", "Mumbai", "Bengaluru", "Pune", "Hyderabad"],
    "actualAvoid": ["Patna", "Dhanbad", "Shimla", "Jammu", "Siliguri"],
    "source": "Nykaa Acquisition Filings (2021) outlining national D2C reach."
  },
  {
    "id": "vahdam", "brand": "Vahdam Teas", "product": "Premium Turmeric Tea", "priceINR": 900, "marginPercent": 75,
    "priceSegment": "luxury", "incomeTarget": "luxury", "warehouseCity": "Delhi", "deliveryRadiusKM": 3000,
    "needsColdChain": false, "hasDistributor": "direct", "channels": ["D2C", "Specialty Retail"],
    "brandMaturity": "emerging", "primaryGoal": "brand_awareness", "launchBudgetINR": "Above Rs1Cr",
    "actualTop6": ["Delhi", "Mumbai", "Bengaluru", "Pune", "Hyderabad", "Chennai"],
    "actualAvoid": ["Patna", "Dhanbad", "Shimla", "Jammu", "Siliguri"],
    "source": "Fireside Ventures funding detailing luxury global & metro-India focus."
  },
  {
    "id": "milkymist", "brand": "Milky Mist", "product": "Paneer 200g", "priceINR": 90, "marginPercent": 25,
    "priceSegment": "mid", "incomeTarget": "mid", "warehouseCity": "Erode", "deliveryRadiusKM": 600,
    "needsColdChain": true, "hasDistributor": "yes", "channels": ["Kirana", "Modern Trade", "Quick Commerce"],
    "brandMaturity": "established", "primaryGoal": "capture_market_share", "launchBudgetINR": "Above Rs1Cr",
    "actualTop6": ["Chennai", "Bengaluru", "Kochi", "Coimbatore", "Thiruvananthapuram", "Hyderabad"],
    "actualAvoid": ["Delhi", "Mumbai", "Chandigarh", "Jaipur", "Lucknow"],
    "source": "CRISIL Ratings outlining hyper-dense South Indian cold-chain network."
  },
  {
    "id": "yogabar", "brand": "Yoga Bar", "product": "Multigrain Energy Bar", "priceINR": 50, "marginPercent": 50,
    "priceSegment": "premium", "incomeTarget": "premium", "warehouseCity": "Bengaluru", "deliveryRadiusKM": 2000,
    "needsColdChain": false, "hasDistributor": "yes", "channels": ["Modern Trade", "Quick Commerce", "Specialty Retail"],
    "brandMaturity": "emerging", "primaryGoal": "capture_market_share", "launchBudgetINR": "Rs20L - Rs1Cr",
    "actualTop6": ["Bengaluru", "Mumbai", "Delhi", "Pune", "Hyderabad", "Chennai"],
    "actualAvoid": ["Patna", "Dhanbad", "Shimla", "Jammu", "Siliguri"],
    "source": "ITC Acquisition Disclosures (2023) detailing modern trade / fitness center presence."
  },
  {
    "id": "slurrpfarm", "brand": "Slurrp Farm", "product": "Millet Pancake Mix", "priceINR": 150, "marginPercent": 55,
    "priceSegment": "premium", "incomeTarget": "premium", "warehouseCity": "Delhi", "deliveryRadiusKM": 2000,
    "needsColdChain": false, "hasDistributor": "yes", "channels": ["D2C", "Modern Trade", "Quick Commerce"],
    "brandMaturity": "emerging", "primaryGoal": "brand_awareness", "launchBudgetINR": "Rs20L - Rs1Cr",
    "actualTop6": ["Delhi", "Mumbai", "Bengaluru", "Pune", "Hyderabad", "Chennai"],
    "actualAvoid": ["Patna", "Dhanbad", "Shimla", "Jammu", "Siliguri"],
    "source": "Fireside Ventures funding detailing metro parents demographic targeting."
  },
  {
    "id": "trueelements", "brand": "True Elements", "product": "Oats & Chia Seeds 500g", "priceINR": 350, "marginPercent": 50,
    "priceSegment": "premium", "incomeTarget": "premium", "warehouseCity": "Pune", "deliveryRadiusKM": 2000,
    "needsColdChain": false, "hasDistributor": "yes", "channels": ["D2C", "Quick Commerce", "Modern Trade"],
    "brandMaturity": "emerging", "primaryGoal": "revenue", "launchBudgetINR": "Rs20L - Rs1Cr",
    "actualTop6": ["Pune", "Mumbai", "Bengaluru", "Delhi", "Hyderabad", "Chennai"],
    "actualAvoid": ["Patna", "Dhanbad", "Shimla", "Jammu", "Siliguri"],
    "source": "Marico Acquisition Press Release (2022)."
  },
  {
    "id": "muscleblaze", "brand": "MuscleBlaze", "product": "Whey Protein 1kg", "priceINR": 2500, "marginPercent": 55,
    "priceSegment": "premium", "incomeTarget": "premium", "warehouseCity": "Delhi", "deliveryRadiusKM": 3000,
    "needsColdChain": false, "hasDistributor": "yes", "channels": ["D2C", "Specialty Retail"],
    "brandMaturity": "established", "primaryGoal": "revenue", "launchBudgetINR": "Above Rs1Cr",
    "actualTop6": ["Delhi", "Mumbai", "Bengaluru", "Pune", "Hyderabad", "Chandigarh"],
    "actualAvoid": ["Patna", "Dhanbad", "Shimla", "Jammu", "Siliguri"],
    "source": "HealthKart / Matrix Partners funding detailing gym-centric distribution."
  },
  {
    "id": "kapiva", "brand": "Kapiva", "product": "Thar Aloe Vera Juice 1L", "priceINR": 350, "marginPercent": 60,
    "priceSegment": "premium", "incomeTarget": "premium", "warehouseCity": "Mumbai", "deliveryRadiusKM": 2000,
    "needsColdChain": false, "hasDistributor": "yes", "channels": ["D2C", "Modern Trade", "Quick Commerce"],
    "brandMaturity": "emerging", "primaryGoal": "brand_awareness", "launchBudgetINR": "Rs20L - Rs1Cr",
    "actualTop6": ["Mumbai", "Delhi", "Bengaluru", "Pune", "Hyderabad", "Chennai"],
    "actualAvoid": ["Patna", "Dhanbad", "Shimla", "Jammu", "Siliguri"],
    "source": "Vertex Ventures funding detailing premium modern Ayurveda positioning."
  },
  {
    "id": "souledstore", "brand": "The Souled Store", "product": "Graphic T-Shirt", "priceINR": 799, "marginPercent": 60,
    "priceSegment": "premium", "incomeTarget": "mid", "warehouseCity": "Mumbai", "deliveryRadiusKM": 3000,
    "needsColdChain": false, "hasDistributor": "direct", "channels": ["D2C", "Specialty Retail"],
    "brandMaturity": "established", "primaryGoal": "revenue", "launchBudgetINR": "Above Rs1Cr",
    "actualTop6": ["Mumbai", "Pune", "Delhi", "Bengaluru", "Hyderabad", "Chennai"],
    "actualAvoid": ["Patna", "Dhanbad", "Shimla", "Jammu", "Siliguri"],
    "source": "Elevation Capital Series C detailing offline flagship store locations."
  },
  {
    "id": "snitch", "brand": "Snitch", "product": "Men's Casual Shirt", "priceINR": 1199, "marginPercent": 65,
    "priceSegment": "premium", "incomeTarget": "mid", "warehouseCity": "Bengaluru", "deliveryRadiusKM": 3000,
    "needsColdChain": false, "hasDistributor": "direct", "channels": ["D2C", "Specialty Retail"],
    "brandMaturity": "emerging", "primaryGoal": "capture_market_share", "launchBudgetINR": "Above Rs1Cr",
    "actualTop6": ["Bengaluru", "Mumbai", "Delhi", "Pune", "Hyderabad", "Ahmedabad"],
    "actualAvoid": ["Patna", "Dhanbad", "Shimla", "Jammu", "Siliguri"],
    "source": "Shark Tank India Season 2 / SWC Global funding."
  },
  {
    "id": "xyxx", "brand": "XYXX Innerwear", "product": "Men's Trunks", "priceINR": 399, "marginPercent": 50,
    "priceSegment": "mid", "incomeTarget": "mid", "warehouseCity": "Surat", "deliveryRadiusKM": 2000,
    "needsColdChain": false, "hasDistributor": "yes", "channels": ["D2C", "Modern Trade", "Kirana"],
    "brandMaturity": "emerging", "primaryGoal": "capture_market_share", "launchBudgetINR": "Rs20L - Rs1Cr",
    "actualTop6": ["Surat", "Mumbai", "Pune", "Delhi", "Bengaluru", "Ahmedabad"],
    "actualAvoid": ["Patna", "Dhanbad", "Shimla", "Jammu", "Siliguri"],
    "source": "Amazon Smbhav Venture Fund press release."
  },
  {
    "id": "damilano", "brand": "Da Milano", "product": "Leather Handbag", "priceINR": 12000, "marginPercent": 75,
    "priceSegment": "luxury", "incomeTarget": "luxury", "warehouseCity": "Delhi", "deliveryRadiusKM": 3000,
    "needsColdChain": false, "hasDistributor": "direct", "channels": ["Specialty Retail"],
    "brandMaturity": "established", "primaryGoal": "revenue", "launchBudgetINR": "Above Rs1Cr",
    "actualTop6": ["Delhi", "Mumbai", "Bengaluru", "Pune", "Chandigarh", "Hyderabad"],
    "actualAvoid": ["Patna", "Dhanbad", "Shimla", "Jammu", "Siliguri"],
    "source": "Corporate retail footprint disclosures (premium mall strategy)."
  },
  {
    "id": "peesafe", "brand": "Pee Safe", "product": "Toilet Seat Sanitizer", "priceINR": 180, "marginPercent": 70,
    "priceSegment": "premium", "incomeTarget": "mid", "warehouseCity": "Delhi", "deliveryRadiusKM": 3000,
    "needsColdChain": false, "hasDistributor": "yes", "channels": ["Modern Trade", "Specialty Retail", "Quick Commerce"],
    "brandMaturity": "emerging", "primaryGoal": "brand_awareness", "launchBudgetINR": "Rs20L - Rs1Cr",
    "actualTop6": ["Delhi", "Mumbai", "Bengaluru", "Pune", "Hyderabad", "Chandigarh"],
    "actualAvoid": ["Patna", "Dhanbad", "Shimla", "Jammu", "Siliguri"],
    "source": "Alkemi Growth Capital funding detailing modern trade & pharmacy network."
  },
  {
    "id": "myglamm", "brand": "MyGlamm", "product": "Matte Liquid Lipstick", "priceINR": 395, "marginPercent": 75,
    "priceSegment": "premium", "incomeTarget": "mid", "warehouseCity": "Mumbai", "deliveryRadiusKM": 3000,
    "needsColdChain": false, "hasDistributor": "yes", "channels": ["D2C", "Modern Trade", "Specialty Retail"],
    "brandMaturity": "established", "primaryGoal": "capture_market_share", "launchBudgetINR": "Above Rs1Cr",
    "actualTop6": ["Mumbai", "Delhi", "Bengaluru", "Pune", "Hyderabad", "Chennai"],
    "actualAvoid": ["Patna", "Dhanbad", "Shimla", "Jammu", "Siliguri"],
    "source": "Good Glamm Group / Amazon funding detailing omnichannel scaling."
  },
  {
    "id": "purplle", "brand": "Purplle", "product": "Beauty Retailer", "priceINR": 400, "marginPercent": 65,
    "priceSegment": "mid", "incomeTarget": "mid", "warehouseCity": "Mumbai", "deliveryRadiusKM": 3000,
    "needsColdChain": false, "hasDistributor": "direct", "channels": ["D2C", "Specialty Retail"],
    "brandMaturity": "established", "primaryGoal": "revenue", "launchBudgetINR": "Above Rs1Cr",
    "actualTop6": ["Mumbai", "Delhi", "Bengaluru", "Pune", "Kolkata", "Hyderabad"],
    "actualAvoid": ["Patna", "Dhanbad", "Shimla", "Jammu", "Siliguri"],
    "source": "Premji Invest / Kedaara Capital funding detailing offline store rollouts."
  },
  {
    "id": "boat", "brand": "boAt Lifestyle", "product": "Wireless Earbuds", "priceINR": 1299, "marginPercent": 60,
    "priceSegment": "mid", "incomeTarget": "mid", "warehouseCity": "Delhi", "deliveryRadiusKM": 3000,
    "needsColdChain": false, "hasDistributor": "yes", "channels": ["D2C", "Modern Trade", "Quick Commerce"],
    "brandMaturity": "established", "primaryGoal": "revenue", "launchBudgetINR": "Above Rs1Cr",
    "actualTop6": ["Delhi", "Mumbai", "Bengaluru", "Pune", "Hyderabad", "Chennai"],
    "actualAvoid": ["Patna", "Dhanbad", "Shimla", "Jammu", "Siliguri"],
    "source": "boAt SEBI DRHP (2022) outlining deep metro electronics retail integration."
  },
  {
    "id": "noise", "brand": "Noise", "product": "Smartwatch", "priceINR": 2499, "marginPercent": 50,
    "priceSegment": "mid", "incomeTarget": "mid", "warehouseCity": "Delhi", "deliveryRadiusKM": 3000,
    "needsColdChain": false, "hasDistributor": "yes", "channels": ["D2C", "Modern Trade"],
    "brandMaturity": "established", "primaryGoal": "capture_market_share", "launchBudgetINR": "Above Rs1Cr",
    "actualTop6": ["Delhi", "Mumbai", "Bengaluru", "Pune", "Hyderabad", "Chennai"],
    "actualAvoid": ["Patna", "Dhanbad", "Shimla", "Jammu", "Siliguri"],
    "source": "Titan Acquisition disclosures (Bose investment)."
  },
  {
    "id": "atomberg", "brand": "Atomberg", "product": "BLDC Smart Fan", "priceINR": 3500, "marginPercent": 40,
    "priceSegment": "premium", "incomeTarget": "premium", "warehouseCity": "Mumbai", "deliveryRadiusKM": 2000,
    "needsColdChain": false, "hasDistributor": "yes", "channels": ["D2C", "Modern Trade", "Kirana"],
    "brandMaturity": "emerging", "primaryGoal": "revenue", "launchBudgetINR": "Above Rs1Cr",
    "actualTop6": ["Mumbai", "Pune", "Delhi", "Bengaluru", "Hyderabad", "Chennai"],
    "actualAvoid": ["Patna", "Dhanbad", "Shimla", "Jammu", "Siliguri"],
    "source": "Temasek / Steadview Capital funding detailing premium electricals footprint."
  },
  {
    "id": "lenskart", "brand": "Lenskart", "product": "Premium Eyewear", "priceINR": 2000, "marginPercent": 70,
    "priceSegment": "premium", "incomeTarget": "mid", "warehouseCity": "Delhi", "deliveryRadiusKM": 3000,
    "needsColdChain": false, "hasDistributor": "direct", "channels": ["Specialty Retail", "D2C"],
    "brandMaturity": "established", "primaryGoal": "capture_market_share", "launchBudgetINR": "Above Rs1Cr",
    "actualTop6": ["Delhi", "Mumbai", "Bengaluru", "Pune", "Hyderabad", "Chennai"],
    "actualAvoid": ["Patna", "Dhanbad", "Shimla", "Jammu", "Siliguri"],
    "source": "Softbank / Alpha Wave funding detailing omnichannel metro clustering."
  },
  {
    "id": "caratlane", "brand": "CaratLane", "product": "Diamond Ring", "priceINR": 25000, "marginPercent": 40,
    "priceSegment": "luxury", "incomeTarget": "luxury", "warehouseCity": "Chennai", "deliveryRadiusKM": 3000,
    "needsColdChain": false, "hasDistributor": "direct", "channels": ["Specialty Retail", "D2C"],
    "brandMaturity": "established", "primaryGoal": "revenue", "launchBudgetINR": "Above Rs1Cr",
    "actualTop6": ["Chennai", "Bengaluru", "Mumbai", "Delhi", "Hyderabad", "Pune"],
    "actualAvoid": ["Patna", "Dhanbad", "Shimla", "Jammu", "Siliguri"],
    "source": "Titan Acquisition filings detailing high-street luxury retail locations."
  },
  {
    "id": "hectorbeverages", "brand": "Tzinga (Hector)", "product": "Energy Drink 250ml", "priceINR": 20, "marginPercent": 25,
    "priceSegment": "mass", "incomeTarget": "mass", "warehouseCity": "Bengaluru", "deliveryRadiusKM": 800,
    "needsColdChain": false, "hasDistributor": "yes", "channels": ["Kirana", "Specialty Retail"],
    "brandMaturity": "emerging", "primaryGoal": "brand_awareness", "launchBudgetINR": "Rs20L - Rs1Cr",
    "actualTop6": ["Bengaluru", "Delhi", "Mumbai", "Pune", "Hyderabad", "Chennai"],
    "actualAvoid": ["Patna", "Guwahati", "Shimla", "Jammu", "Siliguri"],
    "source": "Sequoia Capital (Tzinga era 2011) detailing university/IT park focus."
  },
  {
    "id": "sleepwell", "brand": "Sleepwell (Sheela Foam)", "product": "Queen Mattress", "priceINR": 15000, "marginPercent": 35,
    "priceSegment": "premium", "incomeTarget": "mid", "warehouseCity": "Delhi", "deliveryRadiusKM": 500,
    "needsColdChain": false, "hasDistributor": "yes", "channels": ["Specialty Retail"],
    "brandMaturity": "established", "primaryGoal": "revenue", "launchBudgetINR": "Above Rs1Cr",
    "actualTop6": ["Delhi", "Lucknow", "Kanpur", "Jaipur", "Chandigarh", "Agra"],
    "actualAvoid": ["Kochi", "Chennai", "Bengaluru", "Guwahati", "Thiruvananthapuram"],
    "source": "Sheela Foam IPO Prospectus outlining strict bulky-freight geographic boundaries."
  }
];

// Append exactly the new ones that aren't already in
const existingIds = existing.map(e => e.id);
const toAdd = newBrands.filter(b => !existingIds.includes(b.id));

const combined = [...existing, ...toAdd];
fs.writeFileSync(datasetPath, JSON.stringify(combined, null, 2), 'utf8');
console.log(`Added ${toAdd.length} brands. Total is now ${combined.length}.`);
