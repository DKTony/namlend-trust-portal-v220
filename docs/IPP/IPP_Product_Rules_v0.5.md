Instant Payment
Programme

Subject: IPS PRODUCT RULES

Date: 13 March 2025

Version: 0.5

This document contains confidential information intended solely for
the use of authorised recipients within or engaged by the Bank of
Namibia. Unauthorised disclosure, copying, distribution, or use of
any part of this document is strictly prohibited. Any person who is
not an intended recipient is hereby notified that any review,
dissemination, or reliance on this document’s content is not
permitted. If you have received this document in error, please notify
the Bank of Namibia immediately and delete all copies of this
document from your records.

Instant Payment Solution Product Rules

1

Table of Contents

1.  Document History ................................................................................................................ 4

2.  Related Documents ............................................................................................................. 5

3.  Overview ............................................................................................................................. 6

4.  Purpose ............................................................................................................................... 6

5.  Definitions ........................................................................................................................... 6

6.  Application........................................................................................................................... 7

7.

IPS Participants ................................................................................................................... 7

8.  Use Cases and Functionalities ............................................................................................ 8

9.  Handles and Mobile Number Rules ................................................................................... 11

9.1. Introduction ................................................................................................................... 11

9.2. Customer Handle Management (Long Form)................................................................. 12

9.3. Merchant Identification Management (Long Form) ........................................................ 14

9.4. Handle Blacklisting Criteria ............................................................................................ 16

9.5. Mobile Number Rules .................................................................................................... 16

10.

User Registration ........................................................................................................... 18

10.1.

10.2.

10.3.

Introduction ............................................................................................................ 18

User Registration via IPSP Mobile Application ....................................................... 19

User Registration via Central USSD ...................................................................... 25

11.

12.

Transaction Limits and Frequency ................................................................................. 28

Person-to-Person Send Money (P2P) Rules.................................................................. 29

12.1.

12.2.

12.3.

12.4.

35

12.5.

12.6.

12.7.

12.8.

12.9.

Introduction ............................................................................................................ 29

IPS Mobile Application User Journey: P2P Send Money using the Mobile Number 31

IPS Mobile Application User Journey: P2P Send Money using IPS Handle ........... 33

IPS Mobile Application User Journey: P2P Send Money using the Payee QR Code

IPS USSD User Journey: P2P Send Money using central – Mobile Number .......... 36

IPS USSD User Journey: P2P Send Money using Central – IPS Handle ............... 38

P2P Send Money Transaction Rules ..................................................................... 39

P2P Send Money: Mobile Application Rules .......................................................... 40

P2P Send Money: Central USSD Rules ................................................................. 41

Instant Payment Solution Product Rules

2

13.

Person-to-Merchant (P2M) Payment Rules ................................................................... 42

13.1.

13.2.

13.3.

45

13.4.

13.5.

13.6.

13.7.

13.8.

13.9.

Introduction ............................................................................................................ 42

IPS Mobile Application User Journey: P2M Payment using Merchant IPS Handle . 43

IPS Mobile Application User Journey: P2M Payment using Merchant Unique Code

IPS Mobile Application User Journey: P2M Payment using Merchant QR Code .... 47

IPS USSD User Journey: P2M Payment using Merchant IPS Handle .................... 48

IPS USSD User Journey: P2M Payment using Merchant Unique Code ................. 49

Merchant Types ..................................................................................................... 50

Small Merchant Rules (Category B Merchants) ..................................................... 51

Big Merchant Rules (Category A Merchants) ......................................................... 52

13.10. Merchant Category Codes ..................................................................................... 52

13.11. Merchant Transaction Rules .................................................................................. 53

13.12. Merchant Acquisition Standards ............................................................................ 54

13.13. Merchant Mobile Application Rules ........................................................................ 57

14. Merchant Cash-In .......................................................................................................... 58

15. Merchant Cash-Out ....................................................................................................... 58

Instant Payment Solution Product Rules

3

1. Document History

Version Date

Amendments

Authority

V.0.1

V.0.2

V.0.3

V.0.4

14 February 2025 First draft of the Rules

IPP Business Lead

20 February 2025 Handle and Mobile Rules enhanced

IPP Business Lead

26 February 2025 Registration Rules

IPP Business Lead

06 March 2025

• FNB comments on use of

IPP Business Lead

accounts to make payment

addressed.

• Added Transaction limits and

frequency

• Added the P2P rules

• Renumbering and font alignment

• Grammer fixes

V.0.5

13 March 2025

• Grammer fixes

IPP Business Lead

• Fixing of P2P tables

• Added P2M Rules

• Renumbering and font alignment

Table 1: version control

Instant Payment Solution Product Rules

4

2. Related Documents

2.1. These Rules should be read together with the following documents:

Title

Abbreviation

Payment System Management Act 14 of 2023

IPP Functional Specification Document (FSD) V.6.0

IPP Technical Specification Document (TSD) V.0.4

Bank of Namibia Open Banking Position Paper

PSM Act

IPP FSD

IPP TSD

BON OB

Bank of Namibia Quick Response Code Guidance Note

BON QR Code

Bank of Namibia Solution Design Document Version 0.2

SDD

Determination for the Authorisation of Payment System Operators and

PSD-6

System Participants in the National Payment System

Determination on Card Interchange and ATM Surcharging

PSD-11

Determination on the Issuance of Electronic Money in Namibia

PSD-3

Namclear New Services Functional Specification V6.0

Namclear SFS

Table 2: Document references

2.2. Should there be any discrepancies or ambiguities in interpreting these Rules and the

PSM Act 14 of 2023 and any of its subordinate regulations, the provisions of the PSM

Act and the regulations will take precedence.

2.3. Should there be any discrepancies or ambiguities in interpreting these Rules and the

IPP TSD, IPP FSD or any other industry or PCH document, the provisions of these Rules

will prevail in so far as the Instant Payment Solution is concerned.

Instant Payment Solution Product Rules

5

3. Overview

3.1. The Instant Payment Solution (IPS) is a payment and clearing switch that enables both

banking institutions and non-banking financial institutions to provide instant payment

services through bank accounts and electronic money (e-money) wallets in an

interoperable and multidimensional payment ecosystem.

3.2. The IPS is an API-based solution that enables IPS participants to seamlessly interface

various payment applications such as mobile applications, USSD, internet banking, and

QR code payments, among others to provide the end user with a fast payment

experience regardless of their bank or non-bank e-money issuer.

3.3. The IPS allows for interoperability across payment channels, devices, ATMs and

institutions for inclusive participation. It also allows interoperability between multiple

identifiers such as national identity, mobile number, and unique aliases.

4.  Purpose

4.1. The purpose of the IPS Product Rules is to establish and provide a standardised

framework that governs how the IPS use cases and functionalities should operate and

be rolled out by the instant payment solution participants (IPSPs). The Rules aim to

provide a uniform and seamless user experience of the IPS services regardless of the

IPSP providing the services. The user experience referred to includes participants, third

parties, merchants, and end users.

5.  Definitions

5.1. Unless the context indicates otherwise, the words and expressions used herein will have

the same meaning assigned to them in the PSM Act, and the IPP FSD.

Instant Payment Solution Product Rules

6

6. Application

6.1. These product rules apply to a broad range of stakeholders within the IPS payment

ecosystem. These include:

a) The instant payment solution operator

b) The instant payment system participants

c) Third party enablers

d) Merchants / business

e) Public Institutions, Offices, Ministries and Agencies

f)

Individual users

7.  IPS Participants

7.1. IPS Participants (IPSP) will be responsible for performing the following functions / roles,

as applicable:

7.1.1. Payer Instant Payment Solution Participant (Payer IPSP): Banks/non-banks can

onboard a customer on an IPS enabled app allowing the customer to register himself

on IPS services and providing him the options to approve a financial transaction or

non-financial request wherever necessary.

7.1.2. Payee Instant Payment Solution Participant (Payee IPSP): Banks/non-banks can

onboard a customer/merchant and allow them to receive money. It is also known as

beneficiary IPSP.

7.1.3. Remitter SoV Provider: All IPS users need to have a banking account or an e-money

wallet with an IPS enabled bank/non-bank. While performing a transaction, the user’s

bank account / wallet will be debited. The remitting SoV Provider also holds the

responsibility to authenticate the IPS PIN set by the customer.

Instant Payment Solution Product Rules

7

7.1.4. Beneficiary SoV Provider: Any credit going to an IPS user will be credited in beneficiary

bank/non-bank account or wallet. The bank/non-bank receiving the funds in IPS

transactions will be acting as a beneficiary.

8.  Use Cases and Functionalities

8.1. For go-live, the IPS supports seven (7) use cases namely person-to-person (P2P),

person-to-business/merchant (P2B/M), government-to-person (G2P), business-to-

person (B2P), merchant cash-in, merchant cash-out and ATM withdrawals which are all

significant and relevant to immediately enhancing financial inclusion and securing

adoption from the public. During phase 2, additional use cases such as request-to-pay,

person to government (P2G) and cross-border payments will be added to complete the

IPS suite of services.

Uses cases User type

Features

Channels

Alias

P2P

Individual

customer

and sole

trader

• Send money.

• Central

• 15–20-character full form

• Receive

USSD

alias: (john123@sovprovider

money.

• Mobile

• 9-digit short form alias:

• Preapproved

App

841235684 (linked to full

authorised

•

Internet

form)

payments

banking

P2B/M

Individual

• Pay merchant

• Central

Payment to

customer to

merchant

USSD

• merchant full form alias of 15-

• Mobile

20 characters:

App

merchant123@sovprovider

•

Internet

banking

Instant Payment Solution Product Rules

8

Uses cases User type

Features

Channels

Alias

• QR Code

• merchant short form alias: 8-

digit unique number mapped

to full form

G2P

Government

• Government

• Bank of

• Bulk payments from IPN

agencies to

pension and

Namibia

handle:

person

grants through

(CMBO)

governmentpayments@IPN

Bank of

Namibia

(Note: These will be Pre-Auth

transactions)

B2P

Business to

• Preauthorised

• Business Payment from

person

business

• merchant full form alias of 15-

payments (one

to many)

20 characters:

merchant123@sovprovider

Cash in at

Individual

• Cash-in

• Mobile

•

Individual provides merchant

merchant

customer

providing

app

with short form alias (mobile

cash in at

merchant

mobile number

• Central

number)

(short-form

USSD

• QR Code

alias)

• Cash in

scanning

merchant QR

code

Cash-out at

Individual

• Cash-out by

• Mobile

• Merchant QR code

merchant

customer

scanning

App

• Merchant unique code

cash-out at

merchant

merchant QR

• Central

code

USSD

• Cash-out by

• QR Code

inserting

Instant Payment Solution Product Rules

9

Uses cases User type

Features

Channels

Alias

merchant

unique code in

USSD menu

ATM

Individual

•

Individual

• ATM

Short form alias (mobile number)

withdrawal

customer

withdrawal

• Central

withdrawal at

from ATM

USSD

ATM

using short

form alias

(mobile

number)

Table 3: IPS use cases overview.

8.2. The IPS is predominantly a mobile application solution meaning that users require a

mobile device to perform IPS services. Both smartphones and basic features are

supported. For P2P and P2B payments, users can make use of mobile applications,

USSD, QR code and online banking to transact. Online banking transactions will be

preauthorised. A user with cash will be allowed to fund their store of value at any enabled

merchant by initiating the cash-in service using their mobile phone through a mobile

application, USSD or scanning the merchant’s QR code. A similar approach will be

followed for cashing out at merchant. Government to person payments will be

preauthorised payments facilitated by the Bank of Namibia (banker to Government) on

behalf of government agencies to government beneficiaries. Like G2P, businesses will

also be enabled to perform bulk payments to persons through a mobile application or

online banking. The use cases and channels provided below are the basis of the product

rules provided in this document which aim to detail the functionalities that all IPSPs must

adhere to.

Instant Payment Solution Product Rules

10

Channels

P2P

P2B

Cash in at

Cash out

G2P

ATM

B2P

merchant

at

merchant

/ Use

Cases

Mobile

app

USSD

QR code

Online

banking

Table 4: IPS use cases and channels overview.

9.  Handles and Mobile Number Rules

9.1. Introduction

The effective management of customer and merchant identifiers is critical to ensuring the

seamless functioning of the Instant Payment Solution (IPS). This section outlines the

guidelines and standards governing the creation, usage, and maintenance of IPS handles

and mobile number rules. IPS handles serve as simplified and user-friendly aliases that

enable customers and merchants to perform transactions without relying solely on lengthy

account numbers. These handles, combined with strict mobile number management

protocols, aim to enhance user convenience while maintaining system integrity, security, and

interoperability. This section details the rules for customer and merchant handle issuance,

uniqueness requirements, handle reactivation policies, and mobile number formatting and

usage, all of which contribute to the overall efficiency and reliability of the IPS ecosystem.

Instant Payment Solution Product Rules

11

9.2. Customer Handle Management (Long Form)

Figure 1: Alias construct

9.2.1. Each IPSP can issue their customers with an IPS handle. The handle properties are

as follows:

a) The handle can be the customer’s name, surname or account number followed by

the “@” symbol and the IPSP’s routing handle. For example, username@IPSP.

b) The handle must be unique and can be alphanumeric.

c) The handle must not be longer than 20 characters.

d) The IPS handle must be in lower case only.

e) The customer’s mobile number can not be a handle.

f) Handles should not contain offensive characters / phrases / names.

9.2.2. A customer’s IPS handle should be mapped to the customer’s account number or e-

money wallet number.

9.2.3. Once a customer’s IPS handle has been opted by a customer and later the profile is

closed, then the IPSP should not allow this IPS handle to be used by any other

person/entity for a period of 24 months post the deactivation by the initial customer.

Instant Payment Solution Product Rules

12

9.2.4. The same customer can reactivate their own handle through the IPSP before the 24

months mentioned above lapse.

9.2.5. Each IPSP is required to maintain a database of all customer IPS handles that are

linked to the customer’s bank account or e-money wallet. This should include a list of

handles that are blacklisted, not permitted and inactive.

9.2.6. The IPS Operator will maintain a consolidated database of all customer IPS handles

that are active, blacklisted, not permitted and inactive.

9.2.7. Every customer handle created by an IPSP is subject to approval by Instant Payment

Namibia.

9.2.8. An IPS customer can perform an IPS transaction using their IPS handle, and mobile

number.

9.2.9. An IPS customer can have multiple handles with one IPSP or just one handle linked to

multiple SoVs. This means that if a customer has 3 SoVs with one IPSP, they can (a)

be assigned a handle per SoV by that specific IPSP or (b) the IPSP can simply assign

one handle for all three SoVs. If the IPSP choose option (b), only one SoV can be

active on the IPS at a time.

SoVs at IPSP1

(a) Handles at IPSP1

(b) 1 handle at IPSP1

One

Customer

Cheque Account

account@IPSP1

with multiple SoVs

Savings Account

savings@IPSP1

customer@IPSP1

customer@IPSP11

Wallet

wallet@IPSP1

customer@IPSP1

1 In this example, the customer has linked their handle to their savings account meaning only the savings
account can be associated with that handle and the other 2 are not active on the IPS.

Instant Payment Solution Product Rules

13

Table 5: Multiple SoVs at 1 participant

9.2.10. An IPS customer can have multiple handles across IPSPs and all can be active. If the

customer choses to use a third-party mobile application (different from their SoV

Provider) for IPS, they can only link one handle at the time to that mobile application.

Note that a third-party mobile application provider can also be an IPSP (refer to 7.1.1

above).

IPSPs

Handles

at

Third Party

IPSP Mobile

IPSPs

App

One Customer with multiple

IPSPP1

customer@IPSP1 Can choose to link one at a

IPSPs

IPSP2

customer@IPSP2

time

Table 6: Multiple IPSPs

IPSP3

customer@IPSP3

9.3. Merchant Identification Management (Long Form)

9.3.1. Each IPSP can issue their merchants with a merchant handle with the following

properties:

a) The merchant handle should be simple, memorable and relatable.

b) The merchant handle can be the merchant’s trading name followed by the “@”

symbol and the IPSP’s routing handle. For example, bigshop@IPSP.

c) The merchant handle must be unique and can be alphanumeric.

d) The handle must not be longer than 20 characters.

e) The handle must be lower case only.

f) The owner’s name cannot be the handle.

9.3.2. An IPSP can assign a merchant with an 8-digit unique code that can be linked to the

merchant’s full form handle.

Instant Payment Solution Product Rules

14

9.3.3. The merchant unique code cannot exceed 8 digits or else it will conflict with the mobile

numbers already stored in the alias directory.

9.3.4. Each IPSP will be assigned with two (2) leading numbers to identify the IPSP. For

example, IPSP1 may be assigned the numbers 30 and IPSP2 may be assigned

numbers 41. In this case, IPSP1 issues their merchant with a unique code 30876541

which can be linked to their merchant handle i.e., bigshop@IPSP1.

9.3.5. A merchant with SoVs at multiple IPSPs should have the same last 6-digit unique code

across multiple IPSPs, with the 2 leading numbers of the entire code still being unique

to each IPSP.

9.3.6. Only SMEs, MSMEs, and large merchants qualify for unique codes, sole traders will

be treated as individuals meaning their full form aliases can be linked to their mobile

numbers.

9.3.7. Once a merchant’s handle or unique number has been opted by a merchant and later

the profile is closed, then the IPSP should not allow this merchant’s handle or unique

number to be used by any other merchant for a period of 24 months post the

deactivation by the initial customer.

9.3.8. The same merchant can reactivate their own handle through the IPSP before the 24

months mentioned above lapse.

9.3.9. Each IPSP is required to maintain a database of all merchant IPS IDs that are linked

to the merchant’s bank account or e-money wallet. This should include a list of handles

that are blacklisted, not permitted and inactive.

9.3.10. The IPS Operator will maintain a consolidated database of all merchant IPS handles

that are active, blacklisted, not permitted and inactive.

Instant Payment Solution Product Rules

15

9.3.11. Every merchant ID created by an IPSP is subject to approval by Instant Payment

Namibia.

9.3.12. A merchant onboarded onto the IPS can send and receive money using their merchant

handle, merchant unique code, or e-money wallet number.

9.4. Handle Blacklisting Criteria

9.4.1. Any Handle that has been flagged for fraudulent activity previously must be backlisted.

9.4.2. Handles that engage with untrustworthy recipients, such as those related to gambling

or the dark web, must be blacklisted.

9.4.3. Individuals attempting to establish a handle that mentions well-known figures (such as

movie stars, politicians, or influencers, etc.) in Namibia should be prohibited.

9.5. Mobile Number Rules

9.5.1. When a customer is registering as a new IPS user, the mobile application or USSD

menu should not require the user to enter their mobile number. This should be detected

by the mobile application / USSD service.

9.5.2. Only a mobile number that is linked to a store of value (bank account or wallet) can be

used for onboarding and mapping.

Instant Payment Solution Product Rules

16

Figure 2: Mobile number mapping

9.5.3. Any leading zero “0” in the user mobile number or user mobile number starting with

country code “+264” must be removed by the IPSP and the mobile number shall be 9-

digit. For example, Jane can choose to provide her mobile number as 0812345679 or

+264812345679 but her IPSP must ensure to remove the leading zero “0” or “+264”

when linking her mobile number to a full form in the Alias Directory.

9.5.4. In the alias directory, Jane’s mobile number will be stored as 812345679 linked to her

full form e.g., jane123@IPSP.

9.5.5. Mobile numbers can only be reused after 6 months. And since the customer is not

inserting the mobile number but rather this is automatically linked to the account /

wallet, the customer will in any case have to update their KYC at the participant before

binding a mobile number.

Instant Payment Solution Product Rules

17

10. User Registration

10.1. Introduction

10.1.1. User registration is the process of onboarding an IPS customer onto the instant

payment solution. User registration can be conducted through 3 channels namely,

smartphone mobile application registration, USSD registration, and IPSPS onboarding.

10.1.2. IPSPs are required to enable their mobile applications to allow Users to self-register

on their mobile devices. A central USSD channel will be provided by the Operator to

enable users with basic feature phone or no mobile data to onboard through USSD.

10.1.3. IPSPs should be able to internally onboard their customers to the IPS, however,

activation of an Ips User’s Handle should be subject to consent and authorisation by

the User.

10.1.4. For registering a User, two (2) factors are authenticated, that is mobile number

registered with the User’s store of value and the ID number linked to that mobile

number.

10.1.5. These Rules will cover User registration using a mobile application and the central

USSD menu. IPSP onboarding is left to each participant to efficiently execute.

Instant Payment Solution Product Rules

18

Figure 3: User registration options

10.2. User Registration via IPSP Mobile Application

10.2.1. The table provides the requirements of an IPS User registration process.

Requirement

Primary Actors

Description

• Payer IPSP

• SoV Provider

•

IPS User

Trigger

• The smartphone user logs into their store of value

provider’s IPS Interface and selects the option

register for the IPS product

Prerequisites

• The user has a smartphone

• The user has an active sim card

• The user has data

• The user has a store of value and met KYC

requirements

Instant Payment Solution Product Rules

19

a) Onboarding Using debit

• Device binding

Card

• Mobile number linked to store of value

• User to provide last 6 digits of debit card and

b) Onboarding using MNO

• Device binding

expiry date

Database

• Mobile number linked to ID number at MNO

• Mobile number linked to store of value

Table 7: Smartphone general rules

10.2.2. The Table provides the journey to be followed for all user registration on a participant’s

mobile application.

Instant Payment Solution Product Rules

20

Step 0: Opening Channel

• The Participant App should ensure a separate IPS registration journey

is possible on its mobile application.

• The channel should clearly indicate the option to register for Instant

Payment Solution.

Step

1A:

Onboarding

• The Participant App should provide the User with a screen detailing the

Process

Journey the User is about to take.

• The User should be able to confirm or cancel the registration session.

Step

1B:

Application

• The Participant App should ask the User for application permissions to

Permission

verify the User’s mobile number and to send SMS and view SMS.

Instant Payment Solution Product Rules

21

Step 2 (A and B): Device

• This step allows the User to choose if they wish to conduct device

Binding

binding on mobile number, they wish to register to the IPS.

• Users should not be able to input the number – this should be

autodetected by the App.

• Only one mobile number can be used during device binding.

• This screen should also include the following statement: “By clicking

Next, I agree to the terms and conditions. Regular carrier charges may

apply”

• Once the User verifies and consents to device binding, this feedback to

be provided to the User on the next screen.

Step 3: Enter a Custom

• The User should be allowed to enter or view their handle that will be

Name

linked to a store of value.

• Given the rules on handle properties, the IPSP can choose to

automatically assign this handle or suggest plausible handles to the

User.

Step 4: Select and Link SoV • On this screen, the user should be able to select the SoV they want to

• The User handles properties provided under section 9.2 are applicable.

link to their handle.

• The screen should present all eligible SoVs i.e., transactional account,

savings account or a wallet.

• The user should confirm and move to the next page.

Step 5A: Setting IPS PIN

• This page should prompt the User to set their IPS PIN and informing

them that the PIN should be 6-digits.

• The User should further be informed that by setting an IPS PIN, they are

linking their selected SoV to a handle. The message should read “You

are now linking Selma123@PSPA to your current account ending

XXXXXXX1233456” (as displayed on the screen).

Step

5B: Debit

card

• The User should have the option of verifying their registration using their

verification

Debit card or through ID. If the User has a debit card, the next screen

should allow the user to enter the last 6 digits and expiry date of their

debit card linked to that SoV.

Instant Payment Solution Product Rules

22

• The IPSP may request the User to include Debit card CVV number

during verification.

Step 5C: MNO Verification

•

If the User does not have a debit card or they are linking a mobile wallet,

they should be allowed to verify through their MNO by providing the last

6 digits of their ID number.

• A successful verification will transmit an OTP to the User.

• An unsuccessful verification should inform the User that Registration

has failed.

• For IPS purposes, all wallets should be linked to an ID number.

Step 5D: Enter OTP

• On this screen, the User should be requested to enter the OTP received

from their SoV Provider (5B) or from the MNO (5C).

• The OTP should be 6 digits.

Step 5E: Set IPS PIN

• The User sets the IPS PIN

• The User must re-enter the PIN to confirm

• The IPS PIN is set on a page of the IPSP that is linked to the IPS

Common Library.

• The IPSP can choose to have both OTP and PIN set on one page.

Step 6: Confirmation

• The User should get a confirmation that they have successfully

registered for IPS.

• The screen should also display the User’s handle and the SoV it is linked

to.

• The registration journey ends.

Table 8: Recommended Mobile App User Journey

10.2.3. Device Binding Rules

a) Participant to obtain verification through the respective mobile network operator.

b) Participant to store device binding information of the user.

c) Only one mobile number can be bind to a mobile device at a time.

(Note: Here the binding would be one mobile number to one device to one app and

that SIM should be present in the device with active status.)

Instant Payment Solution Product Rules

23

d) Mobile number should be linked to store of value being used on the IPS.

e) The mobile number cannot be entered but should be prepopulated.

f) Participant must integrate with their SMS Gateway provider to get the VMN (Virtual

Mobile Number) on which the SMS will be sent from user device.

g) SMS Gateway will send a response of this SMS to the Participant along with the

mobile number.

h) Participant must provide API endpoint to receive this response from SMS Gateway.

i) Participant must acquire short code from SMS Gateway provider.

j)

If a customer removes the sim card from the mobile device and inserts it later again,

the device binding process should be repeated.

10.2.4. General User Registration Rules

a) The IPS Participant must provide the User with a list of all Store of Value Provider

onboarded onto the IPS Switch.

b) The user must not be allowed to proceed if the selected SoV is not active or has

derogatory status (fraud related). In the non-active derogative state, the store of value

provider must reject the registration request.

c) The user must be shown the full form alias details; this includes the handle associated

with the user’s store of value.

d) The user must be given the option to stop proceeding / exit the alias registration at

any stage of the user journey up to the successful notification step.

e) The user may only be able to have one default alias at any given time.

f) The User (with consent) will be able to override any previous default alias

registrations in the Operator’s Alias Directory.

g) The User (with consent) may be preboarded by the SoV Provider, but the full form

alias should not be active until the user accepts the terms of service and adds a IPS

pin.

Instant Payment Solution Product Rules

24

h) The User may only attempt registration three (time), on the fourth (4th) attempt, the

User should not be permitted to attempt registration and should be wait 24hours to

try again or alternatively contact their IPSP.

10.3. User Registration via Central USSD

10.3.1. The registration process through USSD will be different from that of mobile application.

For Go-live, USSD registration will be provided by the IPS Operator.

10.3.2. For go-live, registration through a participant's USSD channel will not be permitted.

10.3.3. USSD has a limited functionality which will not allow Users to verify themselves using

OTP. In case of a bank account, verification will only be done by entering the full

names, mobile number, and Identification number of the user.

10.3.4. In the case of a mobile wallet, the Users full name, mobile number as well as wallet

pin will be required for verification. Verification will only be performed by the store of

value provider.

10.3.5. The table provides the requirements of a user registration process.

Requirement

Primary Actors

Description

• Payer IPSP

• SoV Provider

•

IPS User

Trigger

• The User dials the central USSD short code (for

example *140*140#) and selects

the option

register for the IPS product

Prerequisites

• The user has a basic

feature phone or

smartphone

• The user has an active sim card

Instant Payment Solution Product Rules

25

• The user has a store of value and met KYC

requirements

c) Onboarding Using debit

• Mobile number linked to store of value

Card

• User to provide last 6 digits of debit card and

expiry date

d) Onboarding using MNO

• Mobile number linked to ID number at MNO

Database

• Mobile number linked to store of value

Table 9: USSD registration general rules

10.3.6. The Table provides the journey to be followed for all user registration on the central

USSD.

Step 0

The User dials the central USSD short code for the first time.

Instant Payment Solution Product Rules

26

Step 1

Step 2

Step 3

Step 4

The User is requested to select the Store of Value Provider they

have an account with.

The User is requested to select the store of value they want to

register on the IPS.

The User is prompted to enter a handle name.

• The User is prompted to choose the most viable verification

method. They can either verify their profile by providing the last

6 digits of their debit card and the expiry date or they can

provide their ID number.

•

The IPSP may request the User to include Debit card CVV

number during verification.

Step 5

• Depending on the choice selected, the User enters their

information and is verified to proceed to the next screen.

•

If the verification fails at the Store of Value provider or at the

MNO, the USSD session terminates.

Step 6

Step 7

After successful verification, the User creates a 6-digit IPS PIN

The User is prompted to enter the 6-digit IPS PIN again.

USSD Menu

This is the preferred central USSD menu that the User will see after

they have successfully registered, and they dial the short code

Table 10: Recommended USSD User Journey

(*140*140#).

10.3.7. General User Registration Rules: USSD

a) The user must not be allowed to proceed if the selected SoV is not active or has

derogatory status (fraud related). In the non-active derogative state, the bank must

reject the request.

b) The user must be shown the full Alias details; this includes the handle associated with

the user’s store of value.

c) The user must be given the option to stop proceeding / exit the Alias registration at

any stage of the user journey up to the successful notification step.

Instant Payment Solution Product Rules

27

d) The user must be provided with an opportunity to verify the details of the newly

registered Alias before confirming the change.

e) The User (with consent) will be able to override any previous default alias registrations

in the Operator’s Alias Directory.

f) The User (with consent) may be preboarded by the SoV Provider, but the full form

alias should not be active until the user accepts the terms of service and adds a IPS

pin.

g) In case the customer doesn’t have Wallet/Debit card, and he wants to register to IPS

through USSD then he should have the option of physical onboarding by visiting

authorized agents or participant branches.

11. Transaction Limits and Frequency

11.1. The following daily transaction limits will apply for instant payment transactions on the

IPS switch at go-live. Participants are required to ensure that the limits are adhered to.

P2P and P2M are debit limits meaning they apply from origination. B2P limits require

the Merchant’s SoV Provider’ to ensure that a particular merchant does not exceed the

limit when sending to a person. The limits are subject to review as the solution and

usage matures.

Use case

Description

Daily Transaction
Maximum Limit

Transaction
Frequency per
Daily Transaction
Limit

P2P

P2M

Sending from bank
account

N$10,000.00

Sending from wallet

N$10,000.00

Sending through USSD

N$5,000.00

10

10

10

Paying from bank
account

N$10,000.00

100

Instant Payment Solution Product Rules

28

Paying from wallet

N$10,000.00

Sending through USSD

N$5,000.00

100

100

B2P

G2P

Preauthorised and non-
preauthorised payment
per individual recipient

Preauthorised payment
per individual recipient

N$10,000.00

Unlimited

N$10,000.00

Unlimited

Cash-out at
Merchant

From bank account or
wallet

N$2,000.00

Cash out at
ATM

From bank account or
wallet

N$2,000.00

Cash in at
Merchant

Into bank account or
wallet

N$2000.00

Table 11: Transaction limits and frequency

2

2

5

12. Person-to-Person Send Money (P2P) Rules

12.1. Introduction

P2P send money will be possible for all registered IPS Users. Each IPSP will provide the P2P

send money functionality on their channels. IPS Users should be able to perform P2P send

money using their mobile phone (both smartphone and basic feature) through a mobile

application or USSD. On a mobile application, an IPS User should be able to send instant

money to a mobile number, an IPS Handle or by scanning the beneficiary’s static QR code.

On the central USSD, an IPS User should be able to send money to a mobile number or an

IPS Handle. Banks may also enable their customers to initiate P2P send money through the

online banking channel. The Table provides the prerequisite requirements of for a P2P send

money.

Instant Payment Solution Product Rules

29

Requirement

Description

Primary Actors

• Payer IPSP

• SoV Provider

• Payee IPSP

•

IPS User

• Central USSD PSP

Trigger

• The User opens the IPSP’s mobile application, online banking or

central USSD menu and initiates a P2P send money.

Prerequisites

• Both sender and recipient must be registered on the IPS platform with

valid aliases (e.g., mobile numbers or

full-form aliases

like

john123@ipsp).

• Users must have an active Store of Value (SoV) (bank account or e-

money wallet) linked to their IPS profile.

• Only active transactional accounts, savings accounts and electronic

wallets licensed in terms of PSD-3 are eligible.

• Both payer and payee should not have derogatory status on any of

their SoVs.

• The IPSP’s mobile application must be secured and require a

password to start using the service.

• Two-factor authentication is mandatory for initiating P2P send money

Table 12: P2P send money requirements

transactions.

Instant Payment Solution Product Rules

30

12.2. IPS Mobile Application User Journey: P2P Send Money using the Mobile Number

Step 0

Step 1

Step 2

The IPS User opens the Participant’s mobile application,

navigates to IPS and selects the option to send instant money.

The IPS User selects the option to send to a mobile number.

• The IPS User is required to enter the mobile number or search

it from their contact list.

Instant Payment Solution Product Rules

31

• The IPS User is prompted to verify the mobile number – this

step verifies whether the selected mobile number is linked to

a full form handle in the Alias Directory (see FSD)

• Once successfully verified, the IPS User is shown the full form

handle that is linked to the mobile number they intend to send

money to.

Step 3

• The IPS User enters the amount and reason for payment

• Reason for payment can be a drop-down menu or free text

for the user to insert.

• The User selects which store of value they wish to be debited

for the send money.

Step 4

• The IPS User is presented with a payment confirmation page

to validate the payment details before proceeding.

• The IPS User confirms payment details and moves to the next

stage.

Step 5

Step 6

• The IPS User is requested to enter the 6-digit IPS PIN

• The User is presented with a confirmation page that the

transaction was successful.

Step 7 (optional)

• This optional step gives the IPS User a summary of the

Table 13: Send money using mobile number

payment details.

Instant Payment Solution Product Rules

32

12.3. IPS Mobile Application User Journey: P2P Send Money using IPS Handle

Step 0

Step 1
Step 2

The IPS User opens the Participant’s mobile application,
navigates to IPS and selects the option to send instant money.
The IPS User selects the option to send to an IPS Handle.
The IPS User is required to enter the IPS Handle or search it
from their contact list.
The IPS User is prompted to verify the IPS Handle – this step
verifies whether the selected IPS Handle is linked to a
beneficiary at the Payee IPSP (the beneficiaries handle has the
IPSP’s name).

Instant Payment Solution Product Rules

33

Step 3

Step 4

Step 5
Step 6

Step 7

Once successfully verified, the IPS User is shown the
beneficiaries full name that is linked to the IPS Handle they
intend to send money to.
The IPS User enters the amount and reason for payment
Reason for payment can be a drop-down menu or free text for
the user to insert.
The User selects which store of value they wish to be debited
for the send money.
The IPS User is presented with a payment confirmation page to
validate the payment details before proceeding.
The IPS User confirms payment details and moves to the next
stage.
The IPS User is requested to enter the 6-digit IPS PIN
The User is presented with a confirmation page that the
transaction was successful.
This optional step gives the IPS User a summary of the
payment details.

Table 14: Send money using IPS Handle

Instant Payment Solution Product Rules

34

12.4. IPS Mobile Application User Journey: P2P Send Money using the Payee QR Code

Step 0

Step 1

Step 2

Step 3

Step 4

The IPS User opens the Participant’s mobile application, navigates
to IPS and selects the option to send instant money.
The IPS User selects to send money by scanning the beneficiary’s
static QR code.
The IPS User is informed who they are about to pay.
The beneficiary’s details are displayed (full name and IPS Handle)
The Customer is prompted to enter the amount they intend to send.
The User is further requested to choose the store of value that must
be debited for the transaction.
The IPS User is presented with a screen to verify the payment and
enter the IPS PIN.
The User is presented with a confirmation page that the transaction
was successful.

Table 15: Send money using QR Code

Instant Payment Solution Product Rules

35

12.5. IPS USSD User Journey: P2P Send Money using central – Mobile Number

Step 0

• The IPS User dials the central USSD short code on a mobile

phone (both smart phone and basic feature phone)

• The USSD service will recognise the following:

✓ Registered sim card

✓ Sim card and mobile number linked to IPSP participant

✓ Mobile number registered on IPS

Step 1

• The IPS User is presented with the IPS main menu of the IPSP

that the mobile number is registered to.

• The IPS User selects the send money option (1).

Instant Payment Solution Product Rules

36

Step 2

• The IPS User is presented with 3 options, either to pay to a mobile

• The IPSP’s name will be displayed on the Menu.

Step 3

Step 4

Step 5

number, an IPS Handle or view saved beneficiaries.

• The IPS User selects option 1 to enter the beneficiary’s mobile

number.

• The IPS User enters the beneficiary’s mobile number and

confirms.

The IPS User is requested to enter an amount and confirm.

• The IPS User is informed that they are about to send money to

the selected mobile number with the underlying IPS handle and

that an amount will be deducted to their linked store of value.

• The IPS User is further required to enter their IPS PIN and confirm.

Step 6

• The IPS User is presented with the confirmation of the successful

Table 16: Send money using USSD and mobile number

transaction and payment details.

Instant Payment Solution Product Rules

37

12.6. IPS USSD User Journey: P2P Send Money using Central – IPS Handle

Step 0

• The IPS User dials the central USSD short code on a mobile

phone (both smart phone and basic feature phone)

• The USSD service will recognise the following:

✓ Registered sim card

✓ Sim card and mobile number linked to IPSP participant

✓ Mobile number registered on IPS

Step 1

• The IPS User is presented with the IPS main menu of the IPSP

that the mobile number is registered to.

Instant Payment Solution Product Rules

38

• The IPS User selects the send money option (1).

• The IPSP’s name will be displayed on the Menu.

Step 2

• The IPS User is presented with 3 options, either to pay to a mobile

Step 3

Step 4

Step 5

number, an IPS Handle or view saved beneficiaries.

• The IPS User selects option 2 to enter the beneficiary’s IPS

Handle.

The IPS User enters the beneficiary’s IPS Handle and confirms.

The IPS User is requested to enter an amount and confirm.

• The IPS User is informed that they are about to send money to the

selected IPS Handle with the underlying Name and that an amount

will be deducted to their linked store of value.

• The IPS User is further required to enter their IPS PIN and confirm.

Step 6

The IPS User is presented with the confirmation of the successful

Table 17: Send money using USSD and IPS Handle

transaction and payment details.

12.7. P2P Send Money Transaction Rules

12.7.1. All P2P send money transactions should observe the transaction limits and frequency

provided in Table 11.

12.7.2. The IPS Switch must validate the beneficiaries handle and provide confirmation to the

sender before the transaction is processed.

12.7.3. IPS Users must authenticate every transaction using an IPS PIN.

12.7.4. Once a P2P transaction is confirmed and processed, it cannot be reversed by the

sender.

12.7.5. Refunds are allowed for failed transactions or disputes raised within 24 hours.

Instant Payment Solution Product Rules

39

12.7.6. Reversals are initiated automatically when a recipient’s SoV provider is unavailable or

rejects the transaction.

12.7.7. Real-time success or failure transaction notifications for both sender and receiver are

mandatory.

12.7.8. Notification of a completed transaction should include transaction ID, transaction

status, transaction reason, amount, recipient alias and time of completion.

12.8. P2P Send Money: Mobile Application Rules

12.8.1. All send money options on a IPSP’s mobile application should be completed in not

more than seven (7) clicks.

12.8.2. An IPSP should allow an IPS User to send money using either a mobile number, an

IPS Handle or scanning the beneficiary’s static QR code.

12.8.3. If an IPS User selects to send money using a mobile number, after successful

verification, the IPSP’s mobile application should display the IPS handle of the

beneficiary.

12.8.4. If an IPS User selects to send money using an IPS handle, after successful

verification, the IPSP’s mobile application should display the full name of the

beneficiary.

12.8.5. If the IPS User selects to send money by scanning the beneficiary’s static QR code,

after successful validation, the IPSP’s mobile application should display the full name

of the beneficiary.

Instant Payment Solution Product Rules

40

12.9. P2P Send Money: Central USSD Rules

12.9.1. A payment through the USSD channel should be completed on not more than 6

menus.

12.9.2. When an IPS User dials the central USSD short code, the USSD service should

automatically recognise the IPSP that has registered the mobile number to the IPS.

The USSD service should recognise the following:

a) Registered sim card

b) Sim card and mobile number linked to IPSP participant

c) Mobile number registered on IPS

12.9.3. The IPSP’s name should be presented on the main menu.

12.9.4. On the USSD channel, if the IPS User sends money to a mobile number, the channel

should present the beneficiary’s IPS handle for the User to confirm.

12.9.5. On the USSD channel, if the IPS User sends money to a IPS handle, the channel

should present the beneficiary’s full name for the User to confirm.

Instant Payment Solution Product Rules

41

13. Person-to-Merchant (P2M) Payment Rules

13.1. Introduction

P2M payments will be possible for all registered users to make payments at merchants. Each

IPSP will enable their merchants to receive instant payments. Merchants should be enabled

to receive payments through their IPS handle, QR code payments, USSD and through their

unique code. IPSPs should provide their merchants with a method of validating or confirming

a payment once the User journey is completed. It is up to the IPSP and its merchant to

integrate IPS merchant payments in existing POS devices or enable payment verification

functionality on the Till or mobile application of the merchant. The Table provides the

prerequisite requirements of for P2M payments.

Requirement

Description

Primary Actors • Payer IPSP

• Payer and Merchant SoV Providers

• Merchant IPSP

•

IPS User

• Central USSD PSP

Trigger

• The User opens the IPSP’s mobile application, online banking

or central USSD menu and initiates a P2M payment.

Prerequisites

• Both the payer and merchant must be registered on the IPS

platform with valid handles.

• Users must have an active Store of Value (SoV) (bank account

or e-money wallet) linked to their IPS profile.

• Only active transactional accounts, savings accounts and

electronic wallets licensed in terms of PSD-3 are eligible to pay

merchants.

Instant Payment Solution Product Rules

42

• Both payer and merchant should not have derogatory status on

any of their SoVs.

• The IPSP’s mobile application must be secured and require a

password to start using the service.

• Two-factor authentication is mandatory for initiating P2M

Table 18: P2M payment requirements

payments.

13.2. IPS Mobile Application User Journey: P2M Payment using Merchant IPS Handle

Instant Payment Solution Product Rules

43

Step 0

Step 1

Step 2

Step 3

Step 4

Step 5

Step 6

The IPS User opens the IPSP’s app and initiates an instant
payment.
The IPS User selects payment method they intend to use to pay
a merchant i.e., to the merchant handle, to the merchant unique
code or scanning the merchant QR.
The IPS User selects payment to Merchant Handle.
The IPS User enters the merchant’s long form handle and
verifies it.
Once verified, the App displays the Merchant’s full name
prompting the IPS User to proceed with the payment.
The IPS User is presented with a payment confirmation screen
to ensure that it is the correct merchant, amount and the store of
value to be debited.
If satisfied, the IPS User enters their IPS PIN to authenticate the
transaction.
The IPS User is presented with a confirmation that the payment
was successful.
AN option page for the IPS User to view the payment details.

Instant Payment Solution Product Rules

44

13.3. IPS Mobile Application User Journey: P2M Payment using Merchant Unique Code

Step 0

Step 1

Step 2

The IPS User opens the IPSP’s app and initiates an instant
payment.
The IPS User selects payment method they intend to use to pay
a merchant i.e., to the merchant handle, to the merchant unique
code or scanning the merchant QR.
The IPS User selects payment to Merchant Unique Code
The IPS User enters the merchant’s unique and verifies it.
Once verified, the App displays the Merchant’s full name
prompting the IPS User to proceed with the payment.

Instant Payment Solution Product Rules

45

Step 3

Step 4

Step 5

Step 6

The IPS User is presented with a payment confirmation screen
to ensure that it is the correct merchant, amount and the store
of value to be debited.
If satisfied, the IPS User enters their IPS PIN to authenticate the
transaction.
The IPS User is presented with a confirmation that the payment
was successful.
AN option page for the IPS User to view the payment details.

Instant Payment Solution Product Rules

46

13.4. IPS Mobile Application User Journey: P2M Payment using Merchant QR Code

Step 0

Step 1

Step 2

Step 3

Step 4

The IPS User opens the IPSP’s app and initiates an instant
payment.
• The IPS User selects payment method they intend to use to
pay a merchant i.e., to the merchant handle, to the merchant
unique code or scanning the merchant QR.

• The IPS User selects to scan the Merchant’s QR Code.
• The Merchant’s name is displayed.
• The IPS User is requested to enter the payment amount and

select which store of value should be debited.

The IPS User is requested to enter the IPS PIN to authenticate
the payment.
The IPS User is presented with a confirmation that the payment
was successful.

Instant Payment Solution Product Rules

47

13.5. IPS USSD User Journey: P2M Payment using Merchant IPS Handle

Step 0

Step 1
Step 2
Step 3
Step 4
Step 5

Step 6

The IPS User dials the central USSD short code to access the
IPS main menu
The IPS User selects the send money option.
The IPS User selects to make payment to an IPS Handle.
The IPS User enters the merchant’s IPS Handle
The IPS User enters the payment amount
The IPS User is informed who they are about to pay, how much
will be deducted from their linked store of value and further
required to enter their IPS PIN to authenticate the payment.
The IPS User is presented with a confirmation that their payment to
the merchant was successful.

Instant Payment Solution Product Rules

48

13.6. IPS USSD User Journey: P2M Payment using Merchant Unique Code

Step 0

Step 1
Step 2
Step 3
Step 4
Step 5

The IPS User dials the central USSD short code to access the
IPS main menu
The IPS User selects the send money option.
The IPS User selects to make payment to a Merchant number.
The IPS User enters the merchant’s number.
The IPS User enters the payment amount
The IPS User is informed who they are about to pay, how
much will be deducted from their linked store of value and
further required to enter their IPS PIN to authenticate the
payment.

Instant Payment Solution Product Rules

49

Step 6

The IPS User is presented with a confirmation that their
payment to the merchant was successful.

13.7. Merchant Types

13.7.1. Merchants are categorised in two (2) types, small merchants such as Sole Traders

that are not registered by BIPA or recognised by the Companies Act, and big

merchants that are not Sole Traders but are recognised under the Companies Act or

established by an Act of Parliament.

13.7.2. Payments to Small Merchants will be referred to Person-to-Small Merchant (P2SM)

and Payments to Big Merchants will be referred to as Person-to-Big Merchants (P2BM)

13.7.3. Small merchants are referred to as Category B Merchants and in this context includes

street vendors, kapana vendors, home shops, informal trading establishments, and taxi

drivers that are not formally registered with the Business and Intellectual Property

Authority (BIPA).

13.7.4. Big merchants are referred to as Category B Merchants and includes close

corporations, private limited companies, public companies, section 21 companies, and

state-owned enterprises established in terms of Acts of Parliament.

13.7.5. Both merchant types will be assigned with Merchant Category Codes (MCCs) that will

further identify type of business and pricing category.

13.7.6. A Merchant Category Code is an ISO defined standard to classify merchant categories

in retail payments across payment modes, including the IPS.

Instant Payment Solution Product Rules

50

13.8. Small Merchant Rules (Category B Merchants)

13.8.1. Small Merchants must be issued with a static QR code and a unique merchant code

by their IPSP to accept IPS payments.

13.8.2. Small Merchants must be assigned MCC 7407 to differentiate them from other

merchants.

13.8.3. The responsibility of onboarding Small Merchants and assigning the MCC shall be of

the Payee IPSP.

13.8.4. While all transactions under the Small Merchants category shall be settled as P2P

transactions, they will be categorised as merchant transactions based on the MCC.

13.8.5. Small Merchants will have a daily receiving limit of N$10,000 through their IPS QR

Codes or Merchant Unique Codes.

13.8.6. Small Merchants that have completed Device Binding as part of Individual User

onboarding should be able to send money and receiving money using their mobile

number2 (on top of having a QR code and unique merchant code that is linked to their

MCC).

2 If their mobile number is mapped to their full form handle.

Instant Payment Solution Product Rules

51

13.9. Big Merchant Rules (Category A Merchants)

13.9.1. A Big Merchant must be issued with a static QR code and a unique merchant by their

IPSP to accept IPS payments.

13.9.2. Each Big Merchant must be assigned with a MCC by its IPSP, to differentiate them

from other merchants.

13.9.3. The responsibility of onboarding Big Merchants and assigning the MCC shall be of the

Payee IPSP.

13.9.4. There will be no daily receiving limit for Big Merchants unless otherwise specified in an

IPN Circular and based on the relevant MCC.

13.10. Merchant Category Codes

13.10.1.

The Merchant Category Codes adopted by VISA and MasterCard shall apply to

Namibian Merchants in the IPS.

13.10.2.

Small Merchants (Category B) must be onboarded under the MCC 7407 by their

IPSPs.

13.10.3.

The switching fee for (P2SM) transactions acquired under MC 7407 will be the

same as P2P transactions.

13.10.4.

The switching fee for all other MCCs shall be the same unless otherwise specified

in an IPN Circular.

Instant Payment Solution Product Rules

52

13.11. Merchant Transaction Rules

13.11.1.

Acquirers must ensure that all merchants display their QR codes and Merchant

Unique Codes at merchant check-out platforms (both instore and online).

13.11.2. Whenever acquiring a merchant, an IPSP must whitelist the payment address of

the merchant (verify merchant handle) so that whenever payments are made to the

verified merchant addresses, the IPSP’s mobile application can show “handle verified”

icon/colour. This is critical to minimise phishing attacks by imitating payment requests

from well-known merchants.

13.11.3.

IPSP mobile apps must show the transaction details (amount, transaction

reference details, address to which payment is being made, clear indication if the

merchant handle is whitelisted in the IPS, and the payment confirmation details post

payment) during and after the transaction is done for all recent transactions.

13.11.4.

IPSPs may also have the option of showing the last ten financial transactions in

the “Transaction History” option.

13.11.5.

A merchant’s handle should be distinctly visible in the mobile application landing

page, and visible along with the merchant’s QR code and unique code.

13.11.6.

The obligation to acquire, manage and monitor merchant relationships is the

responsibility of acquiring IPSPs. Acquiring IPSPs must take full liability for merchants

onboarded by them directly or by partners.

Instant Payment Solution Product Rules

53

13.12. Merchant Acquisition Standards

13.12.1.

An acquiring IPSP must monitor its merchant’s activity periodically i.e., onboarding

criteria, transaction monitoring & control, training etc.

13.12.2.

An acquiring IPSP should ensure that the following points are in place and

adequately addressed:

• Board approved policy for merchant acquisition

• Agreements with various stakeholders (as appropriate)

• Merchant underwriting

• Merchant portfolio and risk monitoring

• Merchant training

The abovementioned key responsibilities are described in detail below:

a) Board approved policy for merchant acquisition

i. Implement policies that include standards to ensure quality / business conduct to

mitigate risk to the IPS in terms of financial or reputational risk.

ii. The policies must be approved by the Acquiring IPSP’s board of Directors and

should have a periodic review mechanism.

b) Agreements with various stakeholders

i. Merchant agreement in place with each merchant / aggregator (as appropriate)

before any service is provided.

Instant Payment Solution Product Rules

54

ii. Appropriate agreements to be in place with any third parry service provider (as

may be required) in case of any of the activities pertaining to merchant acquiring

portfolio is outsourced.

iii. Merchant agreements must be reviewed from time to time and updated

appropriately with changes, if any.

c) Suggest Criteria for Merchant underwriting

i. Acquiring IPSP to verify the merchant (or its mobile application) on origin of

country and ownership for foreign ownership to ensure that there is no conflict with

regulator or Government guidelines.

ii. The underwriting process should provide clarity on permitted merchant types,

segments and allocation of MCCs.

iii. Validation of merchant key information i.e., beneficial ownership, physical

address, BIPA good standing, NAMRA good standing etc.

iv. Website / mobile merchant information screening to ascertain nature of business.

v. Quantifying new merchant’s financial risk exposure (e.g., sale volume, dispute

history, delivery method, contingent liability) wherever applicable.

vi. KYC validation, sanction screening, other verifications, wherever applicable, as

may be required.

vii. Assessing compliance with applicable data security standards and requirements.

Instant Payment Solution Product Rules

55

viii. An acquiring IPSP must classify merchants into Critical, High, Medium & Low risk

segments so that appropriate oversight, monitoring and due diligence is suitably

carried out on a periodic business.

ix. An IPSP must have a prohibited merchant categories / lines of business as guided

below:

• Exclude merchant categories that been banned under National laws and

regulations as may be applicable.

• Exclude merchants operating such business that is not specifically

permitted by the Bank of Namibia, any other regulator or competent

authority.

• Exclude merchants that pose a high brand (or reputational) risk.

• Exclude merchants operating in financial products / services that are not

regulated.

d) Merchant portfolio and risk management

i. An acquiring IPSP shall monitor the merchants onboard by aggregators.

ii. Use predetermined merchant sales volume, transaction amount parameters for risk

monitoring purposes.

iii. Monitor sudden increases and dips in merchant volumes.

iv.Monitor merchant level fraud to sales, chargebacks to sales, reversals and refunds.

v.Website verification for online merchants to review product / service offerings,

refund / cancellation policies, delivery mechanisms as well as terms and conditions.

vi.Carry out investigations for suspicious or questionable transactions.

Instant Payment Solution Product Rules

56

vii.Inactive / dormant merchant review

e) Merchant Training

i. Acquiring IPSPs must create training modules with merchants on the

acceptance methods and guidelines.

ii.

Training to be conducted physically / virtually with adequate information in

line with policy of the acquiring IPSP.

iii.

FAQ’s along with Do’s and Don’ts to be published by the acquiring IPSP.

13.13. Merchant Mobile Application Rules

To enable IPS payments on a merchant’s mobile application, the Merchant App must
meet the following conditions:

a) Software Development Kit (SDK) Integration: The IPS Plug-In is integrated into the

Merchant App using the SDK approach.

b) Compliance with IPN & Sponsor IPSP: The Merchant App must complete due
diligence and meet the Sponsor IPSP’s and IPN’s enablement requirements.

c) Clear Customer Communication: The Merchant App must clearly inform users that
the IPS payment service is provided by the Sponsor IPSP. The IPSP’s logo and
name should be prominently displayed when initiating payments.

d) Regulatory Compliance: The Merchant App must adhere to all IPN, and regulatory

guidelines related to the IPS services.

e) Critical Updates: Any mandatory updates to the Sponsor IPSP’s SDK must be

implemented immediately to ensure seamless functionality.

f) Complaint & Dispute Resolution: The Merchant App must allow users to raise

complaints and disputes for IPS transactions.

g) Delinking Option: The Merchant App must provide users with an option to de-link
their profile from the IPS Plug-In service, preventing further payments through the
app.

Instant Payment Solution Product Rules

57

14. Merchant Cash-In

15. Merchant Cash-Out

Instant Payment Solution Product Rules

58
