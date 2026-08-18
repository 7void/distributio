# Distributio: AI-Driven FMCG Market Viability & Distribution Intelligence
**Comprehensive Presentation Material**

---

## 1. Knowledge on Domain / Problem Statement (5 Marks)

### The Problem
The Indian Fast-Moving Consumer Goods (FMCG) market is a highly fragmented, $110B+ sector characterized by massive geographic diversity, varying infrastructural maturity (e.g., cold chain availability), and stark income inequality. When consumer brands launch new products, they face critical challenges:
1. **Heuristic Bias:** Brands often select launch markets based on intuition or purely population size, ignoring hidden supply chain friction and unit economics.
2. **Margin Erosion:** India's logistics costs (approx. 13-14% of GDP) disproportionately eat into the margins of low-ticket items, making high-demand cities unprofitable if they are geographically distant.
3. **Hyper-Local Competition:** National market share is irrelevant; FMCG competition happens at the micro-market (city) and specific price-point level.

### The Solution: Distributio
Distributio is an algorithmic distribution intelligence platform. It replaces guesswork with a robust, data-driven pipeline that synthesizes Multi-Criteria Decision Analysis (MCDA), Supply Chain Economics, and Marketing Diffusion theory. By combining static demographic/infrastructure datasets with dynamic Large Language Model (LLM) intelligence, Distributio accurately forecasts a city's viability, break-even unit requirements, and demand volume for any given product profile.

---

## 2. Literature Review (Minimum 15 recent/seminal papers) (5 Marks)

The algorithmic foundation of Distributio is built upon 16 seminal and recent academic/industry papers across three disciplines:

**Algorithmic Architecture & Decision Making**
1. **Saaty, T. L. (1980).** *The Analytic Hierarchy Process (AHP)*. McGraw-Hill. (Basis for eigenvector weighting of city signals).
2. **Hwang, C. L., & Yoon, K. (1981).** *Multiple Attribute Decision Making*. Springer-Verlag. (Basis for Simple Additive Weighting (SAW) compensatory algorithms).

**Consumer Economics & Segmentation**
3. **Prahalad, C. K. (2004).** *The Fortune at the Bottom of the Pyramid*. Wharton School Publishing. (Basis for the non-linear affordability multiplier for mass goods).
4. **Bijapurkar, R. (2013).** *A Never-Before World: Tracking the Evolution of Consumer India*. Penguin India. (Basis for purchasing power cliffs and luxury penalties).
5. **D'Andrea, G., et al. (2006).** *Six Truths About Emerging-Market Consumers*. strategy+business. (Basis for Kirana store inventory risk modeling).

**Retail Velocity & Geographic Friction**
6. **NielsenIQ. (2023).** *India FMCG Snapshots: Navigating the Urban-Rural Divide*. (Basis for Tier-1 strategic bonuses).
7. **Roig-Tierno, N., et al. (2013).** *Business Site Selection and Commercial Agglomeration*. Journal of Business Research. (Basis for population density bonuses).
8. **Huff, D. L. (1964).** *Defining and Estimating a Trading Area*. Journal of Marketing. (Basis for exponential distance decay and radius penalties).
9. **Coughlan, A., et al. (2006).** *Marketing Channels*. Prentice Hall. (Basis for modeling distributor friction in fragmented markets).

**Supply Chain & Logistics Economics**
10. **NCAER–DPIIT. (2025).** *Logistics Cost in India: Assessment and Long-Term Framework*. (Basis for exact road freight rate benchmarks).
11. **Chopra, S., & Meindl, P. (2015).** *Supply Chain Management: Strategy, Planning, and Operation*. Pearson. (Basis for FTL/LTL volume discounts).
12. **Horngren, C. T., et al. (2014).** *Cost Accounting: A Managerial Emphasis*. Pearson. (Basis for unit economic break-even equations).
13. **McKinsey & Company. (2021).** *CPG Value Creation: Navigating the Next Normal*. (Basis for the 30-35% minimum contribution margin threshold).

**Marketing Value & Demand Forecasting**
14. **Keller, K. L. (1993).** *Conceptualizing, Measuring, and Managing Customer-Based Brand Equity*. Journal of Marketing. (Basis for flooring penalties to preserve intangible brand value).
15. **Gupta, S., et al. (2006).** *Modeling Customer Lifetime Value*. Journal of Service Research. (Secondary justification for the 0.30 margin floor via LTV:CAC ratios).
16. **Bass, F. M. (1969) & Sultan et al. (1990).** *A New Product Growth for Model Consumer Durables*. Management Science. (Basis for the demand forecasting Coefficient of Innovation, $p=0.03$).

---

## 3. Design of Proposed Methodology (5 Marks)

The methodology follows a robust 4-phase pipeline architecture:

**Phase 1: Generative Feature Extraction**
Raw user inputs (product name, category, price, margin, target audience) are processed by an LLM. The LLM acts as an expert classifier, structuring the data into normalized features: determining the exact `priceSegment` (mass, mid, premium, luxury), calculating `affordability` multipliers, determining `needsColdChain` (boolean), and outlining necessary distribution tiers.

**Phase 2: Dynamic Competitive Intelligence (Parallelized)**
Because competition varies wildly by sub-category and price tier (e.g., ₹10 soap vs. ₹500 face wash), static databases are insufficient. An LLM agent dynamically researches the specific price-point competition, computing a proxy Herfindahl-Hirschman Index (HHI) and evaluating Porter's Five Forces to return specific score penalty metrics for Tier 1, 2, and 3 cities. 

**Phase 3: The Core Scoring Engine (Deterministic Math)**
The normalized features and competition penalties are fed into a deterministic, TypeScript-based mathematical engine. The engine evaluates static city data against the product's logistical and economic constraints. It computes base scores, deducts logistics costs, simulates margin erosion, applies geographic distance constraints, and forecasts unit demand using econometric models.

**Phase 4: Multi-Agent Strategy Synthesis**
The quantitative output (a sorted list of cities with break-even units, margins, and scores) is fed to a team of specialized AI agents. These agents generate structured, qualitative outputs:
- **Strategy Analyst:** Writes an executive narrative memo.
- **Channel Strategist:** Determines the exact channel mix (e.g., 40% Q-Commerce, 60% Modern Trade).
- **Risk Analyst:** Generates a structured risk register.
- **GTM Planner:** Designs a phased launch timeline respecting manufacturing capacity constraints.

---

## 4. Module Description / System Design (5 Marks)

This section details the minute mathematical, economical, and logical metrics within the Phase 3 Core Scoring Engine.

### Module 4.1: Weighted Base Score (Multi-Attribute Utility Theory)
The engine evaluates five signals: Income, Retail, Internet, Logistics, and Cold Chain. 
Weights are dynamically assigned based on product needs and normalized:
$$ \text{baseScore} = \sum_{i} \text{signal}_i \times w_i $$
*Economic Logic:* If a product doesn't need cold chain (`needsColdChain = false`), its weight is zeroed and mathematically redistributed to Retail and Internet, maintaining a sum of 1.0. This is a compensatory SAW algorithm.

### Module 4.2: Affordability Multiplier (Bottom of the Pyramid)
$$ \text{affordAdj} = \text{signal} \times w \times (\text{affordability} - 1) $$
*Economic Logic:* Applied only to Income and Retail signals. Based on Prahalad's theory, `mass` products receive an affordability rating $>1.0$ (e.g., 1.10), mathematically boosting the purchasing power of lower-income cities. `Luxury` products receive an affordability rating $<1.0$ (e.g., 0.55), severely restricting them to high-income metros.

### Module 4.3: Huff's Gravity Model & Haversine Distance
Distance from the user's `warehouseCity` is calculated using the Haversine great-circle formula ($R=6371$ km).
*Economic Logic:* Following Huff's Gravity Model, distance creates friction. If the distance exceeds the user's `deliveryRadiusKM`, a flat penalty is applied, acting as an economic deterrent for distant expansion.

### Module 4.4: Dynamic Logistics Cost Model
Logistics costs ($C_{log}$) per unit are calculated using NCAER 2025 benchmarks:
$$ \text{Base Freight} = \min(\text{FREIGHT\_BASE}, \text{price} \times 0.10) + \left(\frac{\text{distance}}{100} \times 3.0\right) $$
*Economic Logic:* 
1. **Handling Fee Cap:** A fixed base fee (e.g., ₹5) would destroy the margins of a ₹10 product. By bounding it to 10% of unit price, we model FMCG "case-pack" logic (selling cheap items in bulk cartons).
2. **Cold Chain Surcharge:** If required, +35% is added (IFC standard).
3. **Volume Discounts:** `mass` products get a $0.50\times$ discount due to FTL (Full Truckload) dense packing efficiency; `luxury` gets a $1.20\times$ LTL penalty.

### Module 4.5: Margin Multiplier & Viability Thresholds
Variable profit after logistics is calculated: $\text{netMargin} = (\text{price} \times \text{marginPercent}) - C_{log}$
$$ \text{marginRatio} = \frac{\text{netMargin}}{\text{price} \times \text{marginPercent}} $$
$$ \text{Multiplier} = 0.30 + (\text{marginRatio} \times 0.70) $$
*Economic Logic:* 
1. **McKinsey Threshold:** If the margin ratio falls below 35%, severe score penalties trigger.
2. **Brand Equity Floor (Keller):** The multiplier is floored at $0.30$. Even if a product loses money on logistics, establishing a presence in a major city generates long-term intangible brand equity and LTV, meaning the city's score is never reduced to absolute zero.

### Module 4.6: Demand Forecasting (Bass Diffusion Model)
Forecasting initial Year 1 adoption:
$$ \text{Demand}(t=0) = p \times M \times \text{captureRate} \times \text{channelReach} \times \text{tierPenetration} \times \frac{\text{score}}{100} $$
*Economic Logic:* 
- $p = 0.03$ (Coefficient of Innovation from Sultan et al. 1990 meta-analysis).
- $M$ (Total Addressable Market) is mathematically sliced by demographic targeting. If targeting the "Mass" segment, $M$ is restricted to the bottom 40% of the city's population. A 50% lifestyle relevance proxy is also applied to prevent hyper-niche inflation.

### Module 4.7: Asymptotic Score Smoothing
For cities scoring above 90, raw scores are passed through an inverse exponential function:
$$ f(x) = 90 + 10(1 - e^{-(x-90)/10}) $$
*Mathematical Logic:* Prevents the hard ceiling of 100 from causing artificial ties. The score asymptotically approaches 100, preserving minute mathematical differentiation at the very top of the rankings.

### Module 4.8: Break-Even Unit (BEU) Economics
$$ \text{BEU} = \frac{\text{budgetPerCity}}{\text{netMarginPerUnit}} $$
*Economic Logic:* Standard Cost Accounting (Horngren). Determines exactly how many units must be sold in that specific city to cover the fixed marketing/launch budget allocated to it, accounting for the localized logistics drag on the unit margin.
