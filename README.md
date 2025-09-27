# 💊 Blockchain-Tracked Pharmaceutical Adherence Program

Welcome to a revolutionary way to improve medication adherence using blockchain technology! This project creates a decentralized system on the Stacks blockchain that incentivizes patients to stick to their prescribed medication regimens. By integrating IoT devices (like smart pill dispensers), it verifies real-time adherence and rewards consistent users with tokens, addressing the global issue of non-adherence that costs healthcare systems billions and leads to worse patient outcomes.

## ✨ Features

🔒 Secure patient registration and privacy-focused data handling  
📅 Real-time tracking of medication intake via IoT-verified events  
🏆 Token incentives for adherence milestones (e.g., daily/weekly streaks)  
✅ Automated verification and reward distribution  
📊 Analytics for doctors to monitor patient progress anonymously  
💰 Staking mechanism for patients to commit to their regimen  
🚫 Penalty system for non-adherence to encourage accountability  
🔄 Governance for community-driven program updates  

## 🛠 How It Works

This project leverages 8 smart contracts written in Clarity to ensure transparency, security, and decentralization. Here's a high-level overview:

### Core Smart Contracts
1. **PatientRegistry.clar**: Handles patient onboarding, storing encrypted profiles and linking to unique IDs.  
2. **PrescriptionManager.clar**: Allows authorized doctors to issue digital prescriptions, including dosage schedules.  
3. **AdherenceTracker.clar**: Records IoT-submitted events (e.g., pill bottle openings) as immutable logs.  
4. **IoTOracle.clar**: Acts as an oracle to validate and feed external IoT data into the blockchain securely.  
5. **IncentiveToken.clar**: A SIP-10 compliant fungible token contract for issuing adherence rewards.  
6. **RewardsDistributor.clar**: Calculates rewards based on adherence scores and distributes tokens automatically.  
7. **StakingVault.clar**: Enables patients to stake tokens as a commitment, with refunds or bonuses tied to adherence.  
8. **GovernanceDAO.clar**: Manages proposals and voting for adjusting reward rates, penalties, or program rules.

**For Patients**  
- Register via the PatientRegistry contract with your details (anonymized via hashes).  
- Stake tokens in StakingVault to join a program and commit to your regimen.  
- Use an IoT device (e.g., smart pill box) that sends data to the IoTOracle.  
- The AdherenceTracker logs your intake events.  
- Hit milestones? The RewardsDistributor auto-sends IncentiveTokens to your wallet.  
- Miss doses? Face minor penalties from your stake to motivate better habits.

**For Doctors/Prescribers**  
- Verify your credentials and use PrescriptionManager to create tailored regimens for patients.  
- Monitor aggregated, anonymized adherence data to adjust treatments without breaching privacy.

**For Verifiers/Administrators**  
- Use GovernanceDAO to propose changes, like tweaking reward multipliers.  
- Query AdherenceTracker for audits or compliance checks.

Boom! Patients stay healthier, earn rewards, and the system runs trustlessly on the blockchain.

## 🚀 Getting Started  
1. Set up a Stacks wallet and install the Clarity development tools.  
2. Deploy the contracts in sequence (start with IncentiveToken and PatientRegistry).  
3. Integrate with IoT APIs for real-world data feeds.  
4. Test adherence flows in a sandbox environment.

This project not only solves medication non-adherence but also empowers patients with ownership of their health data while providing verifiable insights for healthcare providers. Let's build a healthier future!