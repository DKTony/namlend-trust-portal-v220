Instant Payment Program (IPP)

Version 0.1

Statement of Confidentiality and Disclaimer

Technical Specification Document
Instant Payment Program (IPP)

Version 0.7

        Technical Specification Document                               1 | P a g e

This page is intentionally left bank.

        Technical Specification Document                               2 | P a g e

Statement of Confidentiality and Disclaimer

The contents presented herein are strictly confidential and proprietary to National Payments Corporation of India (NPCI) and/or
NPCI International Payments Ltd (NIPL). The document is intended solely for the limited purposes for the audiences/recipients
that it is being presented/provided to. The documents and reports provided are for informational purposes and private circulation
only and do not constitute any offer. They do not purport to be a complete description of the subject matter referred to in the
document.

While utmost care has been taken in preparing the document, we claim no responsibility for the accuracy or completeness of
information. Information contained in the document is provided “as is” without warranty of merchantability or fitness for a
particular purpose or non-infringement. Unless specifically noted, National Payments Corporation of India and/or NPCI
International Payments Ltd. is not responsible for the contents of these documents. We shall not be liable for any direct or
indirect losses arising from the use there of and the viewers are requested to use the information contained herein at their
own discretion and risk.

No part of the document should be reproduced, re-circulated, published in any media/website or otherwise, shared or copied or
re-represented in any form or manner without the explicit written permission of National Payments Corporation of India
and/or NPCI International Payments Ltd. Any unauthorized use, disclosure or public dissemination of information contained
herein is prohibited.

The information, contents shared in the document are subject to change without notice.
© NPCI/ NIPL 2024, All rights reserved.

        Technical Specification Document                               3 | P a g e

Version History

Name

Version
No.

Date

Description

BON Instant Payment Solution (IPS)
TSD_v0.1
BON Instant Payment Solution (IPS)
TSD_v0.2

0.1

0.2

15-Nov-2024

Initial Draft.

21-Nov-2024

BON Instant Payment Solution (IPS)
TSD_v0.3

0.3

06-Dec-2024

BON Instant Payment Solution (IPS)
TSD_v0.4

0.4

12-Dec-2024

BON Instant Payment Solution (IPS)
TSD_v0.5

0.5

13-Mar-2025

BON Instant Payment Solution (IPS)
TSD_v0.6

0.6

07-July-2025

BON Instant Payment Solution (IPS)
TSD_v0.7

0.7

10-Nov-2025

Changes based on the input
received from BON Tech team.
Additional Tag level updates
included in all the APIs under
Detail API Specifications for
more clarity and readability.
Incorporated
received
Industry participants.
Incorporated
received
Participants
Additional Digital Signature
Guidelines
in
Section Certificate Requirement

the
from BON

feedback
and

feedback
BON

incorporated

the
from

the
from

Details with respect to ATM
Cash withdrawal incorporated.
feedback
Incorporated
received
BON
Participants.
Added flows for Registration
and Alias Directory.
Added
reference
Request/Response for the API
and Use cases.

the

the
from

feedback
BON

Incorporated
received
Participants.
Added new field ClVersion for
version
Library
Common
capture.
Section 3.8.5 Set Reset pin :
National ID (updated the steps)
Section 3.8.6 Set Reset pin :
using Wallet (updated the steps
& Diagram)
059_Detail.name Rule added
for ReqRegMob API
ReqRegMob Note
updated
FORMAT 6, FORMAT 7.

section
1,

FORMAT

for

        Technical Specification Document                               4 | P a g e

Added Negative scenario logs
and logs updated for 6.10.1.3,
6.21
4.4.1.2.
updated 030_Txn_SubType

RespPay

section

        Technical Specification Document                               5 | P a g e

Glossary

Acronym
2-FA
Aadhaar

Alias directory

API
AUA
Customer

Enabler

FRM
IPS
NIPL
Payment Account (or
‘Account’)

Payments Service
Provider (PSP)

Receiver / Payee

Reversal

Sender / Payer

Store of Value

UPI
USSD

Description
2-factor authentication.
This refers to a National Identity for Namibia.
A digital registry that maps the full form alias version of the user with his/her
mobile number, and a merchant with its unique number.

Application Programming Interface
Authentication User Agency
An individual person or an entity having an account and wishes to pay and/or
receive money.

A non-bank payment service provider that is not authorized to provide a store
of value but is authorized to be an indirect participant on the instant payment
switch. The enabler may also be contracted by an instant payment
participant to onboard new instant payment user, or simply provide instant
payment use case services on mobile application.

Fraudulent Risk Management
Instant Payment Solution
NPCI International Payments Limited
Any bank account or any other payment accounts (PPI, Wallets, Mobile
Money etc.) offered by a regulated entity where money can be held, debited
from, and credited to.
Bank, Payment Bank, PPI, or any other regulated entity that is allowed to
acquire customers and provide payment
(credit/debit) services to
individuals and entities.
Person/Entity who receives money. Payee’s account is credited as part of
payment transaction.

Reversal is initiated when either a beneficiary store of value provider is not
available, or a decline is received from the beneficiary store of value provider
in an online message. It is a term that describes the transaction that is
returned to a payer’s store of value provider.
Person/Entity who pays money. Payer’s account is debited as part of
payment transaction.

Means a bank account or electronic wallet provided by a banking institution
or a non-banking payment instrument issuer licensed by the Bank of
Namibia in terms of the Payment System Management Act 14 of 2023.
Unified Payments Interface
Unstructured Supplementary Services Data

        Technical Specification Document                               6 | P a g e

3.

Table of Contents
Statement of Confidentiality and Disclaimer .................................................................................................. 3
Version History ............................................................................................................................................. 4
Glossary ....................................................................................................................................................... 6
Table of Contents ......................................................................................................................................... 7
Introduction.......................................................................................................................................... 11

1.  IPS Architecture .................................................................................................................................. 13
2.  2.1. Overview ...................................................................................................................................... 13
    2.2. Core Features .............................................................................................................................. 13
    2.3. Authorization ................................................................................................................................ 14
    2.4. Architecture .................................................................................................................................. 14
    2.5. Core Domain Entities .................................................................................................................... 16
    2.5.1. Alias ...................................................................................................................................... 16
    2.6. Authentication............................................................................................................................... 17
    2.7. Alias Directory .............................................................................................................................. 17
    2.7.1. Checking availability of Alias Directory ID .............................................................................. 18
    2.7.2. Creation of IPS USER ID based on Merchant ID/Mobile No. ................................................. 24
    2.7.3. Porting of IPS USER ID -Mobile No. ...................................................................................... 26
    IPS Design .......................................................................................................................................... 28
    3.1.
    IPS Pay Flow ................................................................................................................................ 28
    3.2. USSD Pay Flow ............................................................................................................................ 28
    3.3. API’s Briefly .................................................................................................................................. 29
    3.4. Message Security, Trust and Authenticity ..................................................................................... 30
    3.5. Certificate Requirement ................................................................................................................ 32
    3.6. Security Considerations ................................................................................................................ 39
    Identity & Account Validation ........................................................................................................ 40
    3.7.
    3.7.1. Protecting Account Details .................................................................................................... 40
    3.7.2. Protecting Authentication Credentials .................................................................................... 40
    3.7.3. Protecting against Phishing ................................................................................................... 41
    3.8. Registration Flow .......................................................................................................................... 41
    3.8.1. Device Binding ...................................................................................................................... 41
    3.8.2. Alias Creation at IPS Participant PSP .................................................................................... 42
    3.8.3.
    Listing Accounts .................................................................................................................... 43
    3.8.4. Set/Reset IPS PIN (Using Card- For Account) ....................................................................... 45
    3.8.5. Set/Reset IPS PIN (Using National ID - For Account) ............................................................ 46
    3.8.6. Set/Reset IPS PIN (Using WALLET PIN – For Wallet) ........................................................... 48
    3.8.7. Change IPS PIN .................................................................................................................... 50
    3.9. Direct Pay (Sender/Payer initiated) ............................................................................................... 51
    3.9.1. Person Initiated ..................................................................................................................... 51
    3.9.2. System Initiated ..................................................................................................................... 51
    Transaction Flow ................................................................................................................... 51
    3.9.3.

            Technical Specification Document                               7 | P a g e

3.10.

3.9.3.1
3.9.3.2
3.9.3.3
3.9.3.4

Validate Payee VPA........................................................................................................... 51
Validate Payee Mobile Number .......................................................................................... 52
Validate Merchant ID (8-Digits) .......................................................................................... 53
Payment flow: .................................................................................................................... 54
Failure Scenarios ...................................................................................................................... 55
IPS Payer participant unable to notify the Payer: ............................................................... 55
3.10.1.
Response from IPS does not reach IPS Payee/Payer Participant: ..................................... 55
3.10.2.
Response from Payee bank does not reach IPS: ............................................................... 56
3.10.3.
Declined Response from Payee bank to IPS:..................................................................... 56
3.10.4.
Payee bank is not available to IPS: .................................................................................... 56
3.10.5.
Declined Response from Payer bank to IPS: ..................................................................... 56
3.10.6.
Response from Payer bank does not reach IPS: ................................................................ 56
3.10.7.
Payer bank is not available to IPS: ..................................................................................... 56
3.10.8.
3.10.9.
Declined Response from IPS Payee Participant to IPS: ..................................................... 56
3.10.10. Response from IPS Payee Participant does not reach IPS: ............................................... 56
IPS Payee Participant is not available to IPS: .................................................................... 56
3.10.11.
IPS is not available to Payer IPS Participants: ................................................................... 56
3.10.12. 4. Detail API Specifications...................................................................................................................... 57
4.1. API Protocol ................................................................................................................................. 57
4.2. Heartbeat API ............................................................................................................................... 61
4.2.1. ReqHbt .................................................................................................................................. 61
4.2.2. RespHbt ................................................................................................................................ 63
4.3. Non-Financial APIs ....................................................................................................................... 65
List PSP API .......................................................................................................................... 65
4.3.1.
4.3.1.1. ReqListPsp ........................................................................................................................ 65
4.3.1.2. RespListPsp ...................................................................................................................... 66
List Account Providers API .................................................................................................... 69
4.3.2.
4.3.2.1. ReqListAccPvd .................................................................................................................. 69
4.3.2.2. RespListAccPvd ................................................................................................................. 71
4.3.3.
List Keys API ......................................................................................................................... 76
4.3.3.1. ReqListKeys ...................................................................................................................... 76
4.3.3.2. RespListKeys ..................................................................................................................... 79
4.3.4.
List Verified Address Entries API ........................................................................................... 82
4.3.4.1. ReqListVae ........................................................................................................................ 82
4.3.4.2. RespListVae ...................................................................................................................... 84
4.3.5.
List Account API ................................................................................................................... 87
4.3.5.1. ReqListAccount .................................................................................................................. 87
4.3.5.2. RespListAccount ................................................................................................................ 91
4.3.6. Manage Verified Address Entries API ................................................................................. 96
4.3.6.1. ReqManageVae ................................................................................................................. 96
4.3.6.2. RespManageVae ............................................................................................................... 99

        Technical Specification Document                               8 | P a g e

4.3.7. Validate Address API........................................................................................................... 101
4.3.7.1. ReqValAdd ...................................................................................................................... 101
4.3.7.2. RespValAdd ..................................................................................................................... 105
4.3.8. Set Credentials API............................................................................................................ 111
4.3.8.1. ReqSetCre ....................................................................................................................... 111
4.3.8.2. RespSetCre ..................................................................................................................... 116
4.3.9. Mobile Banking Registration API ......................................................................................... 119
4.3.9.1. ReqRegMob .................................................................................................................... 119
4.3.9.2. RespRegMob ................................................................................................................... 126
Check Transaction Status API ....................................................................................... 128
4.3.10.
4.3.10.1. ReqChkTxn ...................................................................................................................... 128
4.3.10.2. RespChkTxn .................................................................................................................... 130
4.3.11.
OTP API .......................................................................................................................... 136
4.3.11.1. ReqOtp ............................................................................................................................ 136
4.3.11.2. RespOtp .......................................................................................................................... 139
4.3.12.
Balance-Enquiry API ........................................................................................................ 141
4.3.12.1. ReqBalEnq ...................................................................................................................... 141
4.3.12.2. RespBalEnq ..................................................................................................................... 147
4.3.13.
Transaction Confirmation API .......................................................................................... 151
4.3.13.1. ReqTxnConfirmation ........................................................................................................ 151
4.3.13.2. RespTxnConfirmation ...................................................................................................... 155
4.3.14.
RegMapper API ............................................................................................................... 157
4.3.14.1. ReqRegMapper ............................................................................................................... 158
4.3.14.2. RespRegMapper .............................................................................................................. 163
4.3.15.
Get Address API .............................................................................................................. 166
4.3.15.1. ReqGetAdd ...................................................................................................................... 167
4.3.15.2. RespGetAdd .................................................................................................................... 171
4.3.16.
ReqMapperConfirmation API ........................................................................................... 175
4.3.16.1. ReqMapperConfirmation .................................................................................................. 175
4.3.16.2. RespMapperConfirmation ................................................................................................ 179
4.4. Financial APIs ............................................................................................................................ 182
4.4.1. Pay API ............................................................................................................................... 182
4.4.1.1. ReqPay ............................................................................................................................ 182
4.4.1.2. RespPay .......................................................................................................................... 203
4.4.2. Authorization Details API ..................................................................................................... 208
4.4.2.1. ReqAuthDetails ................................................................................................................ 208
4.4.2.2. RespAuthDetails .............................................................................................................. 219 5. Appendix ........................................................................................................................................... 234 6. Reference Request/Response Logs .................................................................................................. 246
6.1. HeartBeat ............................................................................................................................... 246
6.2. List PSP .................................................................................................................................. 247

        Technical Specification Document                               9 | P a g e

6.3. List Account Providers ............................................................................................................ 248
6.4. List Keys ................................................................................................................................. 249
6.5. List Verified Address Entries ................................................................................................... 252
6.6. List Account API ..................................................................................................................... 253
6.7. Manage Verified Address Entries API ..................................................................................... 256
6.8. Validate Address ..................................................................................................................... 257
6.9. Set Credential API .................................................................................................................. 262
6.10. Mobile Banking Registration API ......................................................................................... 266
6.10.1.1. Registration through Debit card for Mobile APP ............................................................... 266
6.10.1.2. Registration through Debit card for USSD ........................................................................ 270
6.10.1.3. Registration through Wallet PIN using APP ..................................................................... 273
6.10.1.4. Registration through National Id using APP ..................................................................... 277
6.11.
Check Transaction .............................................................................................................. 281
6.12. OTP API .............................................................................................................................. 282
Balance Enquiry .................................................................................................................. 284
6.13.
6.14. Get Address API .................................................................................................................. 288
6.15.
RegMapper API ................................................................................................................... 293
6.16. Mapper Confirmation ........................................................................................................... 296
6.17.
Payment Request ................................................................................................................ 297
6.18. G2P Transaction ................................................................................................................. 320
6.19. Merchant Cash In – Pay by Alias ......................................................................................... 324
6.20. Merchant Cash out – Pay by Alias ....................................................................................... 335
6.21.
ATM Cash Out..................................................................................................................... 348
6.22. Merchant Cash out – Pay by Merchant Id ............................................................................ 359
Payment Request – Pay by Mobile Number ........................................................................ 373
6.23.
6.24.
Sample Negative Scenario Logs : ....................................................................................... 386
6.24.1.1. Multiple Error Code in Acknowledgement ........................................................................ 386
6.24.1.2. Duplicate Transaction Id .................................................................................................. 388

        Technical Specification Document                               10 | P a g e

1. Introduction

The innovations in digital payment motivated the organizations to consolidate and integrate multiple
systems with varying service levels, into a nation-wide, uniform, and standard business process for all
retail payment systems.

The IPS intends to introduce fast payments, achieve e-money wallets interoperability with bank
accounts, and introduce use cases and functionalities that will enhance financial inclusion,
specifically in the rural areas and the informal sector of Namibia.

The solution being introduced is a payment and clearing switch that enables both banking institutions
and non-banking financial institutions to provide instant payment services in a multidimensional
payment ecosystem. The IPS supports both USSD and Mobile applications as channels that will enable
participants to seamlessly enable multiple use-cases via Application Programming Interface (API). The
IPS is compatible with both e-money wallets and bank accounts as SOVs for customers. IPS provides
a solution that is easy to use, addresses financial literacy concerns, and is always available to offer a
viable alternative to cash.

The consolidated system should facilitate an affordable payment mechanism to benefit the common
men across the country and lower the cost of financial services for underserved consumers.

Bank of Namibia understood the importance of such payment product and introduced IPS as a highly
innovative, flexible product, and can be integrated easily with any bank in a standardized way in
minimal time.

The objective of IPS is to offer architecture and a set of standard APIs to facilitate the next generation
online immediate payments, leveraging trends such as increased smartphone adoption and universal
access to Internet and data.

This document provides details of payments ‘architecture, which is directly connected to achieving the
goals of universal electronic payments, a less cash society, and financial inclusion, using the latest
technological trends.

The

following are some of

the key

features of

the

IPS

Instant Payment Solutions.

1.  The IPS is expected to further propel easy instant payments via mobile, web, and

other applications.

2.  The payments can be either sender (payer) or receiver (payee) initiated and are

carried out in a secure, convenient, and integrated fashion.

3.  This design provides an ecosystem driven scalable architecture and a set of APIs

taking full advantage of mass adoption of smartphones.

4.  A system that is compatible with various devices, channels and platforms addressing

        Technical Specification Document                               11 | P a g e

different needs of the consumer.

5.  Capabilities include alias, 1-click 2-factor authentication, and use of payer’s

smartphone for secure credential capture.

6.  It allows banks and other players to innovate and offer superior customer experience

to make electronic payments convenient and secure.

7.  Supports the growth of e-commerce, while simultaneously meeting the target of

financial inclusion.

In this regards IPS has taken up new initiative of implementing “Instant Payment Switch”
to simplify and provide a single interface across all systems.

1.  SIMPLICITY- Paying and receiving payments should be as easy as making a call on a mobile
    phone. With the IPS system, anyone who has an account can send and/or receive money from
    their mobile phone with just an identifier unacquainted with bank/account details. The
    customer has to select "pay to” a “Alias” (such as National ID number, Mobile number, Alias,
    etc.) with a single click.

2.  INNOVATION- System is simple and layered so that innovations on both payee and payer side
    can happen with no change to core interface. This unified layer allows application providers to
    take advantage of enhancements in mobile devices and payment channels, provide integrated
    payments on new consumer devices, provide innovative user interface features, take advantage
    of newer authentication services, etc.

3.  ADOPTION– System is designed for scalability and mass adoption. This allows interoperability
    across payment channels, devices, and institutions for inclusive participation. Similarly, it
    allows full interoperability among multiple identifiers such as National ID number, mobile
    number, and alias.

4.  SECURITY- System provides end to end resilient security and data protection. Considering self-
    service mobile applications, data capture is secured by encryption. Similarly, the system allows
    a mechanism to pay and collect using valid aliases without having to reveal any bank/account
    details. System provides convenience by offering 1-click 2-factor authentication, risk scoring,
    protection from phishing, etc.

5.  COST- Considering the fact that about \***\* smartphone users exist today, and that number is
    expected to grow to \*\*** in the next 5 years. The solution leverages the growing use of mobile
    phones as acquiring devices and uses alias instead of physical cards, thus reducing cost on
    both acquiring and issuing infrastructure.

\*\*\*\* BON needs to add details mentioned in COST point.

        Technical Specification Document                               12 | P a g e

2. IPS Architecture

This section covers the core features, high level architecture, key concepts, overall value proposition,
a list of possible use cases and real-world usage examples are provided to better understand the
proposal. All technical details of the interface are covered in subsequent chapters.

2.1. Overview

A.

INTEROPERABILITY

1.  Interoperability across payment channels, devices, and

institutions for

inclusive

participation.

2.  Allows full interoperability between multiple identifiers such as mobile numbers and new

aliases.

3.  Allows money to be transferred instantly across bank accounts / wallets in entire system.

B. PUSH PAYMENTS

1.  Payments can be initiated by either the sender (payer) or receiver (payee).
2.  Pay request: The initiating customer pushes funds to the intended beneficiary.

C. SINGLE CLICK 2FA

1.  IPS follows one click 2 factor authentication.
2.  When a transfer is initiated using a smart phone, the device fingerprint (IMEI number for the
    device or any technical details unique to the device) is itself the first factor of authentication.

3.  The second factor is a PIN number which must be keyed in.

D. IDENTIFIER

1.  Ability to integrate accounts/wallets with different banks.
2.  Enables users to carry out all the payment transactions across multiple accounts and thus

provides a single interface for all payments.

2.2. Core Features
IPS provides the following core features via a set of APIs.

1.  The ability to use personal mobile as the primary device for all payments, including person

to person, person to entity, and entity to person.

2.  Ability to use a personal mobile to "PAY" someone (push).
3.  Ability to use mobile number, card number, and account number in a unified way. In

addition, the ability to pay and collect using "Alias" that are "aliases" to.

4.  Make payments by providing an alias without having to ever provide account details or

credentials on 3rd party applications or websites.

5.  Ability of all IPS Participants to use a standard set of APIs for any-to-any push.
6.  The ability to use IPS Participants provides mobile applications, which allow payments from
    any account, using any number of aliases by providing credentials such as passwords and
    PINs.

            Technical Specification Document                               13 | P a g e

7. Ability to use a fully interoperable system across all IPS Participants without having silos and

closed systems.

8.  Ability to make payments using 1-click 2-factor authentication just by using a personal

phone and without any acquiring devices or physical tokens.

2.3. Authorization
Today, authentication and authorization are part of the same transaction flow and inline. Adopting 3rd.
party authentication and cardless payment scheme allows banks to reduce the overall issuance cost
while keeping authorization and account management within its control.

2.4. Architecture

The diagram below shows the overall architecture of IPS allowing USSD, smartphone, Internet banking,
and other channel integration onto a common layer at IPS. Using existing systems ensures reliability of
payment transactions across various channels and takes full advantage of all the investments so far.

        Technical Specification Document                               14 | P a g e

Facilitates online real-time payments through the three payment APIs and a set of supporting APIs. All
APIs are asynchronous in nature, meaning once the request is sent and acknowledgement received, the
processing of response can be sent back separately via corresponding response API.

The overall transaction processing is done through two external-facing interfaces, each of them having
clearly defined responsibilities through application programming interface (API).

IPS - SOV Participant (PSP) Interfaces has a set of sub-interfaces which is used to
communicate between IPS and IPS- SOV Participant.

Routing and Processing

Routes and processes payment request (ReqPay) and request persisted in cache and DB. This will
act as an interface for all components of the system.

1.  Resolver

Resolves the alias and sends the ReqAuthDetails message to, and receives
RespAuthDetails from the corresponding IPS- SOV Participant

2.  Debtor

Interacts with the IPS- SOV Participants through ReqPay / RespPay (Debit) messages for
debit.

3.  Creditor

Handles functionalities regarding Credit.

4.  Internal System Interfaces

Provides interfaces to communicate directly with the underlying IPS systems such as FRM.

        Technical Specification Document                               15 | P a g e

FRM:
It is used at network level. Designed and implemented as a Real-time Fraud Risk Monitoring and
Management solution (FRM). This solution is envisaged as a value-added service offered by IPS to
participating members as a real-time monitoring tool for fraud detection and prevention.

Across all application layers, REST API is used to design the integration interfaces making the system
simple for a web-centric approach. This permits self-service for application developers and app users,
provides API access to valuable enterprise resources, encourages collaboration among internal and
external resources, and increases the value of current customers by offering existing services via new
platforms and devices.

2.5. Core Domain Entities
Every payment request has the following core elements:

1.  Payer SOV and Payee SOV account and institution details for routing and authorization
2.  Authentication credentials (IPS-PIN, Debit Card PIN, OTP, CVV, etc. as required for debit)
3.  Transaction amount
4.  Transaction reference
5.  Timestamp
6.  Metadata attributes such as location, product code, mobile number, device details, etc. as

required.

From the above list of core elements, items 1 and 2 are critical to be abstracted so that single
architecture can handle current and futuristic scenarios of “any alias” using “any trusted
authentication scheme”. The following sections describe these concepts in detail.

2.5.1. Alias
Every payment transaction must have source (Payer SOV) account details (for debit) and destination
(Payee SOV) account details (for credit). At the end, before the transaction can be completed, these
must be resolved to an actual account number/ID.
The IPS will follow a hybrid alias model. Alias constructs will consist of both centralized and
decentralized models. The centralized model will consist of a mobile number that is linked to a full form
alias. The short form alias “mobile number” is stored in the Operator’s Alias Directory at onboarding to
enable the payer to only enter the payee’s mobile number when making a payment or sending money.
A user can link and delink a full form to their mobile number at any time. The full form alias can be
provided by the SOV provider or an Enabler. The decentralized model consists of the full form alias
constructs. A user is allowed to have more than one full form construct with one SOV provider or more
than one SOV provider.

        Technical Specification Document                               16 | P a g e

Centralised Model

812345678

Decentralised Model Bank A

John123@BankA (Default)
IDnumber@BankA
Accountnumber@BankA

Linked to:
John123@BankA
John123@EnablerA
John123@BankC

Bank B
John123@EnablerA
IDnumber@BankB
Accountnumber@BankB

Alias is an abstract form to represent a handle that uniquely identifies account details in a “normalized”
notation. In this architecture, all aliases are denoted as “account@provider" form. Alias translation
may happen at provider/gateway level or at IPS level.
The alias should only contain a-z, A-Z, 0-9, . (dot), - (hyphen).

SOV provider is expected to map the alias to actual account details at an appropriate time. SOV
provider who provides “Alias” should expose the alias translation API (see later sections for API details)
for converting their alias to an address that can be used by IPS. Unlike current systems with fixed length
account numbers and provider numbers (BIN, IFSC {bank code} etc.), aliases are strings of sufficient
length to ensure they accommodate future possibilities.

IFSC (bank code) and account number combination resolved directly by IPS, is represented as
account-no@ifsc-code.ifsc.npci (e.g. 123456789012@ABCD0123456.ifsc.npci). This will be used for the
Government to Person (G2P) payment. The SoV provider needs to pass these details in the <addr> field
of the ReqPay request to IPS.

2.6. Authentication
Traditionally, SOV Provider themselves provide the authentication scheme. Account management
(KYC, opening accounts, managing transactions, etc.) was tightly coupled with internal authentication
schemes. Authentication schemes separately evolved, as new payment channels evolved. While
numeric PIN/Passwords are the dominant authentication factor, different PINs were issued for
different channels (Internet PIN, ATM PIN, Mobile PIN, etc.). In addition, OTP based authentication is used
these days to offer 2-FA authentication schemes. Account management, including KYC, should be
loosely coupled with authentication.

2.7. Alias Directory
Alias Directory (AD) will be maintained as a separate service in IPS. This will help to link the alias to a
number, mobile number or any unique identifier. Post completing the new customer on-boarding
process customer shall now be prompted for Numeric ID generation. For existing users this will be
available as optional. In addition to the current alias and IFSC-Account as payment option, a simple
Alias Identifier (Mobile Number and Merchant ID) can be used for transactions. Related IPS Participants
will have to make the necessary changes required for the registration process and making payments
using these new options. Alias directory maintains the mapping between short form of alias and full
form of alias.

        Technical Specification Document                               17 | P a g e

If Payer provides the full form alias of the Payee, then the IPS will send request to Payee IPS participant
for retrieving necessary details of the beneficiary as mentioned in the specification. In such cases the
request will not be routed to the Alias directory.

2.7.1. Checking availability of Alias Directory ID

This API is used during onboarding to check the availability of the selected IPS User Id.
GetAdd is mandatory for the following scenarios

1. Creation of short form of the alias (Mobile Number /Merchant ID)
2. Transfer of short form of the alias (Mobile Number) to different IPS Participant PSP.

Types of GetAdd API:
GetAdd API will have 3 types called “CHECK”, “FETCH” and “PORT”.

CHECK: Type “CHECK” is used to check the last updated status of the IPS USER ID

• Used to retrieve the status of the short form alias which is active with the IPS

•

•

participants.
If the short form alias is “Active” or “Inactive” with any other IPS Participant, then
the status cannot be retrieved.
If the requested short form alias is in “Active” or “Inactive” or “Block” or
“Deregister” status, then the IPS Participant PSP should inform the user that the
short form alias selected by the user is not available. Having said this, if the status
of the short form alias is “New” then the IPS Participant PSP will allow to create
the short form of alias as IPS User Id. In such cases the ‘addr’ tag of the API will
not be populated.

FETCH: Type “FETCH” has subtype “ID|VPA” for retrieve functionality of short form of

Alias.

• Subtype “VPA” – Retrieves all the mapped short form alias(IPS User Id’s) of the

corresponding full form alias.

• Subtype “ID” - User will give both full form of alias and cmId (short form of alias),

the system would provide the status if the combination present or not.

• The status of IPS User ID (short form of alias), of current initiated IPS Participants

profile will be retrieved.

• For subType=” VPA”, RegIdDetails block not required.
• For subType=”ID”, Payer.addr + RegIdDetails.value field is mandatory. To fetch
the linked full form of alias, user has to try the combination available full form of
alias against the IPS User Id and GetAdd API will provide the status. The system
will reject the invalid combination.

PORT: Type “PORT” is used while transferring mobile number from one IPS Participant to

        Technical Specification Document                               18 | P a g e

Other IPS Participant

• Supports only “Mobile Number” as IPS User Id for this type.
• Users can check if the mobile number is already mapped and it’s in “Active” or

“Inactive” status with other IPS Participant.

• The “addr” tag will give complete full form of alias without any masking.
• Alias directory will reject the request when type ” PORT” is used for creation of

new IPS User Id (Mobile Number)

This API shall be used for checking the availability of an IPS User Id before creating a new record
as well as for fetching status in case of timeout of CREATE/MODIFY/DELETE record.

2.7.1.1. Checking availability based on Merchant ID

Steps for checking availability of Alias Directory ID-Merchant ID (8 digits):

1.  The user opens the IPS application and enters a Merchant ID of 8 digits.
2.  The app provides basic client-side validations (e.g., length, format).
3.  The request sent to the IPS participant for availability check.
4.  The IPS participant constructs a ReqGetAdd API request with the following key parameters and

sent to IPS Switch.
• Txn.type = "CHECK" – indicates a status check operation.
• RegIdDetails.Id.name = "NUMERICID" – specifies the short form of alias type.
• RegIdDetails.Id.value = <entered_numeric_id> – the actual ID(Merchant ID) entered by the

user.

        Technical Specification Document                               19 | P a g e

• Consent.name = "CMREGISTRATION" and Consent.value = "Y" – user consent for checking

availability of the short form of alias.

5.  IPS Switch sends an acknowledgment (ACK) to the IPS participant confirming receipt of the

request.

6.  IPS Switch then forwards the request to the Alias Directory to check the status of the Merchant

ID in the directory.

7.  The Alias Directory checks the Merchant ID and returns one of the following idStatus values.

idStatus.value Meaning
NEW
ACTIVE
INACTIVE
DEREGISTERED

BLOCKED

ID does not exist in the system. Available for registration.
ID is already registered and linked to an Alias. Not available.
ID exists but is not currently active. Not available.
ID was previously registered and deleted. Can be reclaimed within 6
months. Applicable only for Merchant ID
ID is blacklisted due to compliance or fraud. Not available.

8.  IPS Switch Sends RespGetAdd API to IPS participant with:

•

idStatus = <status_from_directory>

9.  IPS participant sends an ACK back to IPS confirming receipt of the response.
10. Based on the idStatus, the IPS participant app displays appropriate messages to the user. Below

are sample messages for reference only.

idStatus
NEW
ACTIVE
INACTIVE
DEREGISTERED "This ID was deleted. You can reclaim it within 6 months."
BLOCKED

User Message
"This ID is available. You can proceed with registration."
"This ID is already linked to another account. Please choose a different ID."
"This ID exists but is inactive. It cannot be used for registration."

"This ID is blacklisted and cannot be used."

11. Based on the status received, user proceeds accordingly:
    E. If the Merchant ID is NEW, the user proceeds to register it via ReqRegMapper API.
    F. If not, the user may:

o Choose a different Merchant ID.
o Exit the registration process.

        Technical Specification Document                               20 | P a g e

2.7.1.2. Checking availability based on Mobile Number

Steps for checking availability of USER ID-Mobile no. (9 digits):

1.  The user opens the IPS application and selects the option to use their Mobile Number as their

IPS User Id.

2.  The app captures the mobile number (typically from the device SIM).
3.  The IPS Participant performs local validation (e.g., format, length, duplication).
4.  The IPS Participant constructs a ReqGetAdd API request with the following key parameters, sent

to the IPS.
• Txn.type = "CHECK" – indicates a status check operation.
• RegIdDetails.Id.name = "MOBILE" – specifies the ID type.
• RegIdDetails.Id.value = <user_mobile_number> – the actual mobile number.
• Consent.name = "CMREGISTRATION" and Consent.value = "Y" – user consent for checking

availability.

5.  IPS sends an acknowledgment (ACK) to the IPS Participant confirming receipt of the request.
6.  IPS Switch validates the following:
    • Validate the mobile number.
    • Check the status of the mobile number in alias directory.

7.  The Alias Directory checks the mobile number and returns one of the idStatus values.
8.  If the status is ACTIVE, INACTIVE, or DEREGISTERED, the response also includes, addr = <Linked
    Alias> – the Alias currently associated with the mobile number. Response sent back to IPS.

9.  IPS constructs a RespGetAdd API response with:
    idStatus = <status_from_alias directory>

•

        Technical Specification Document                               21 | P a g e

• addr = <linked_alias> (if applicable)

10. IPS sends this response to the IPS Participant.
11. IPS Participant sends an ACK back to IPS Switch confirming receipt of the response.
12. Based on the idStatus, the IPS Participant app displays appropriate messages to the user and

user proceeds accordingly:

G. If the Mobile number is NEW, the user proceeds to register it via ReqRegMapper API.
H. If not, the user may:

o Choose for Porting.
o Exit the registration process.

2.7.1.3. Fetch the existing status of Alias /IPS User ID (Merchant Id/Mobile No)

For fetching USER ID and its linkage details IPS Participant will call ‘ReqGetAdd’ API with ‘FETCH’
operation performed on basis on ID selection. The flow of events is similar across all conditions, with
the main difference being the type of ID selected by the user (Merchant ID, Mobile Number or full form
of alias).

Type “FETCH” will have subtype “ID|VPA” for retrieve functionality.

        Technical Specification Document                               22 | P a g e

Condition 1: User selects the Merchant ID

The user selects a Merchant ID (8 digits) and sends it to the IPS Participant.

1.  IPS Participant sends a ReqGetAdd API call to the IPS Switch with the following parameters:

─ Txn.type = "FETCH"
─ subType = "ID"
─ RegIdDetails.IdName = "NUMERICID"
─ Consent.value = "Y"

2.  IPS Switch sends an acknowledgement (Ack) to the IPS Participant for the ReqGetAdd API call.
3.  IPS Switch queries the Alias Directory for the Merchant ID linkage and status of the record.
4.  The Alias Directory responds with the status (ACTIVE, INACTIVE, DEREGISTERED, BLOCKED),

Alias, and ID details.

5.  The IPS Switch sends a RespGetAdd API call to the IPS Participant with the response.
6.  The IPS Participant sends an acknowledgement (Ack) to the IPS Switch for the RespGetAdd API

call.

7.  The IPS Participant shows the results to the user.

Condition 2: User selects Mobile Number

The user selects a Mobile Number and sends it to the IPS Participant.

1.  The IPS Participant sends a ReqGetAdd API call to the IPS Switch with the following parameters:

─ Txn.type = "FETCH"
─ subType = "ID"
─ RegIdDetails.IdName = "MOBILE"
─ Consent.value = "Y"

2.  The IPS Switch sends an acknowledgement (Ack) to the IPS Participant for the ReqGetAdd API

call.

3.  The IPS Switch queries the Alias Directory for the Mobile Number linkage and status of the

record.

4.  The Alias Directory responds with the status (ACTIVE, INACTIVE, DEREGISTERED, BLOCKED),

full form of alias, and ID details.

5.  The IPS Switch sends a RespGetAdd API call to the IPS Participant with the response from the

Alias Directory.

6.  The IPS Participant sends an acknowledgement (Ack) to the IPS Switch for the RespGetAdd API

call.

7.  The IPS Participant shows the results to the user.

        Technical Specification Document                               23 | P a g e

Condition 3: User selects Full Form of Alias
The user selects a full form of Alias and sends it to the IPS Participant.

1.  IPS Participant sends a ReqGetAdd API call to the IPS Switch with the following parameters:

─ Txn.type = "FETCH"
─ subType = "VPA"
─ Consent.value = "Y"

2.  IPS Switch sends an acknowledgement (Ack) to the IPS Participant for the ReqGetAdd API call.
3.  IPS Switch queries the Alias Directory for the Mobile Number linkage and status of the record.
4.  The Directory responds with the status (ACTIVE, INACTIVE, DEREGISTERED, BLOCKED), full form

alias, and ID details.

5.  IPS Switch sends a RespGetAdd API call to the IPS Participant with the response.
6.  IPS Participant sends an acknowledgement (Ack) to the IPS Switch for the RespGetAdd API call.
7.  IPS Participant shows the results to the user.

2.7.2. Creation of IPS USER ID based on Merchant ID/Mobile No.

2.7.2.1. Based on Merchant ID

        Technical Specification Document                               24 | P a g e

2.7.2.2. Based on Mobile Number

Steps for creation of IPS USER ID based on Mobile Number post availability check:

1.  The user selects their 9-digit mobile number, which is received by the IPS Participant and triggers
    a ReqGetAdd API request to the IPS (IPS_Switch) with parameters such as Txn.type = "CHECK",
    RegIdDetails.IdName = "MOBILE", and Consent.value = "Y".

2.  The IPS receives the ReqGetAdd API request and sends a request to the Alias Directory to verify
    the mobile number availability, responding with a status of "NEW", "INACTIVE", or
    "DEREGISTERED".

3.  The IPS sends a RespGetAdd API response to the IPS Participant with the idStatus ("NEW",
    "INACTIVE", or "DEREGISTERED"), which determines the next course of action for the IPS
    Participant. The IPS Participant acknowledges the RespGetAdd response with an Ack for
    RespGetAdd request.

4.  If the idStatus is "NEW", the IPS Participant proceeds with registration, sending a ReqRegMapper
    API request to the IPS with parameters such as Txn.op = "ADD", RegIdDetails.Id.name = "MOBILE",
    RegIdDetails.Id.value = "MobileNo. in digits", and RegIdDetails.Id.status = "ACTIVE".IPS registers
    the mobile number with full form of alias linkage and returns a success response with status
    "ACTIVE", confirming the registration of the mobile number. The IPS Participant acknowledges the
    RespRegMapper response with an Ack.

            Technical Specification Document                               25 | P a g e

If the idStatus is "INACTIVE", the IPS Participant proceeds with activation, sending a
ReqRegMapper API request to the IPS with parameters such as Txn.op = "MODIFY",
RegIdDetails.Id.name = "MOBILE", RegIdDetails.Id.value = "MobileNo.
in digits", and
RegIdDetails.Id.status = "ACTIVE".The IPS updates the mobile number status and returns a
success response with status "ACTIVE", confirming the activation of the mobile number. The IPS
Participant acknowledges the RespRegMapper response with an Ack.

If the idStatus is "DEREGISTERED", the IPS Participant proceeds with re-registration, sending a
ReqRegMapper API request to the IPS with parameters such as Txn.op = "MODIFY",
RegIdDetails.Id.name = "MOBILE", RegIdDetails.Id.value = "MobileNo.
in digits", and
RegIdDetails.Id.status = "ACTIVE". The IPS reactivates the mobile number and returns a success
response with status "ACTIVE", confirming the reactivation of the mobile number. The IPS
Participant acknowledges the RespRegMapper response with an Ack.

5.  The IPS Participant confirms the registration, activation, or reactivation of the mobile number and
    sends a message to the user that the mobile number is successfully linked, activated, or
    reactivated.

6.  The user can now transact using their active IPS USER ID(cmId), completing the process of

creating or modifying IPS USER ID.

2.7.3. Porting of IPS USER ID -Mobile No.

Steps for USER ID Porting Process (Mobile Number):

1.  The user opens the New IPS Participant application and selects the option to update mobile

number as IPS User ID(cmId).

        Technical Specification Document                               26 | P a g e

2. This action triggers the porting workflow in the New IPS Participant system. 3. New IPS Participant PSP sends a “ReqGetAdd” API request to IPS Switch with:
─ Txn.type = "PORT"
─ RegIdDetails.Id.name = "MOBILE"
─ Consent.value = "Y" 4. IPS Switch forwards the request to the Alias Directory to:
─ Check if the mobile number exists.
─ Retrieve the status (“idStatus”) and the full form of alias linked
Directory responds with the following response:
─
─ addr = <Linked Alias> (this becomes prevVpa) 5. IPS sends a “RespGetAdd” API response back to New IPS Participant PSP with the above

idStatus = "ACTIVE" or "INACTIVE" (porting allowed only in these states)

details.

Note: If the mobile number is in “BLOCKED” status, the field “addr” will not be returned and porting
will not be allowed.

6.  Upon user confirmation, New IPS Participant PSP sends a “ReqRegMapper” API request to

IPS Switch to initiate the porting:

─ op = "MODIFY"
Id.name = "MOBILE"
─
─ setStatus = "ACTIVE"
─ Payer.addr = <New PSP Alias> (new Alias to be linked)
─ Consent.prevVpa = <Linked Alias from RespGetAdd> (i.e., “prevVpa”) 7. IPS Switch updates the Alias Directory:
─ The mobile number is now mapped to the New IPS Participant PSP Alias.
─ The old mapping is marked for deactivation. 8. Alias Directory responds with result consists of “idStatus”, “addr” field values stored in

directory.

9.  IPS Switch sends a “RespRegMapper” API response to New IPS Participant PSP confirming

the update.

10. IPS Switch sends a “ReqMapperConfirmation” API request to Old IPS Participant PSP to

confirm the porting and to mark the old alias as `DEREGISTERED`.

The request includes:
─ op = "MODIFY"
idType = "MOBILE"
─
─ status = "DEREGISTER"
─ Payer.addr = <Old IPS Participant Alias>
─ cmId = <Mobile Number> 11. Old

Participant

PSP

IPS

acknowledges

the

request

and

sends

back

“RespMapperConfirmation” with result as "SUCCESS". 12. IPS Switch confirms the completion of the porting process.

        Technical Specification Document                               27 | P a g e

3. IPS Design
This chapter provides high-level technical specifications for various types of payments that can be done
through the IPS, and the corresponding high-level flows.

3.1.

IPS Pay Flow

3.2. USSD Pay Flow

        Technical Specification Document                               28 | P a g e

Note: SPV is responsible for converting the messages from USSD channel to IPS proprietary XML
format.

3.3. API’s Briefly

1.  Asynchronous Communication

Principle: APIs are non-blocking; the system does not wait for a response after sending a
request.
Benefits:
Improves system responsiveness.

•
• Enables parallel processing of multiple transactions.
• Reduces latency and resource locking.

How it works:

• A request initiated with a unique transaction ID.
• The system immediately acknowledges receipt.
• The actual response initiated later through a separate response API, using the same

transaction ID for reference.

2.  Scalability and Performance

Principle: Asynchronous APIs allows the system to scale horizontally and manage high
loads.
Benefits:

• Supports high transaction volumes.
• Avoids bottlenecks caused by synchronous waiting.
• Enables load balancing and distributed processing.

How it works:
•
Incoming requests are queued and processed independently.
• Multiple backend services can process transactions in parallel.
• Load balancers distribute traffic across multiple nodes.

3.  Transaction ID for Correlation

Principle: Every API call must include a unique transaction ID.
Benefits:

• Ensure traceability and auditability.
• Allows accurate matching of requests and responses.
• Facilitates error handling.

How it works:

• The client generates a unique transaction ID for each request.
• This ID included in both the request and the asynchronous response.
• Systems use this ID to correlate and track the transaction lifecycle.

4.  Secure and Standardized Communication

Principle: All APIs must use HTTPS and XML for secure and consistent data exchange.
Benefits:

• HTTPS ensures encrypted transmission.

        Technical Specification Document                               29 | P a g e

• XML provides a structured, interoperable format.
• Ensures compliance with regulatory and industry standards.

How it works:

• All API endpoints exposed over HTTPS.
• Request and response payloads formatted in XML.
• Digital signatures and encryption (for Cred block) applied to protect sensitive data.

5.  Acknowledgement Mechanism (ACK)

Principle: Every request must be acknowledged immediately, even if processing is deferred.
Benefits:

• Confirms that the request received and queued.
• Prevents duplicate submissions of request/response.
•
Improves user experience with instant feedback.
How it works:

• Upon receiving a request, the server queues for processing.
• An immediate ACK sent back to the client.
• The actual processing result sent later via the response API.

6.  Uniform API Design Across Participants

Principle: The same REST-based APIs used by UPI and all its participants (banks, PSPs,
TPAPs).
Benefits:

• Ensures interoperability across the ecosystem.
• Simplifies integration and reduces development effort.
• Promotes standardization and consistency.

How it works:
IPS defines a common API specification.

•
• All participants implement the same set of endpoints and data structures.
• This uniformity allows any participant to interact with any other seamlessly.

3.4. Message Security, Trust and Authenticity
Key security features of the UPI Solution:

1.  End-to-End Security and Data Protection:

Explanation: This means that from the moment a transaction is initiated to its completion,
the data is protected. This is crucial in preventing unauthorized access or tampering with
transaction data.
Importance: It ensures that sensitive information, such as financial details, remains secure
throughout the transaction process, safeguarding both the sender's and receiver's
information.

2.  Digital Signature for Message Integrity and Authentication:

        Technical Specification Document                               30 | P a g e

Explanation: Digital signatures are used to verify the authenticity of the sender and ensure
that the message has not been altered during transmission. This is achieved through public-
key cryptography, where the sender signs the message with their private key, and the
recipient verifies it using the sender's public key.
Importance: This mechanism prevents impersonation and ensures that transactions are
genuine and have not been tampered with, thereby maintaining the trust and integrity of the
IPS system.

3.  Cryptographic Operations via Hardware Security Module (HSM):

Explanation: An HSM is a physical computing device that safeguards and manages
cryptographic keys, performs encryption and decryption, and handles other cryptographic
functions. Using an HSM for cryptographic operations within the IPS ecosystem adds a layer
of physical security to digital transactions.
Importance: HSMs are highly secure and resistant to tampering, which means that even if
the system is compromised, the cryptographic keys and the ability to perform secure
transactions remain protected, ensuring the security of the IPS transactions.

4.  Secure Message Exchange Protocol:

Explanation: The use of HTTPS (Hypertext Transfer Protocol Secure) for communication
ensures that all data exchanged between IPS participants and the IPS platform is encrypted
via SSL certificate. Additionally, the use of XML-formatted messages that are digitally signed
with the RSA-SHA256 algorithm provides confidentiality, integrity, and non-repudiation.
Importance: This ensures that all communication is secure, preventing eavesdropping,
tampering, and man-in-the-middle attacks. The digital signature with RSA-SHA256 algorithm
provides a high level of security, making it virtually impossible for an attacker to alter the
message without being detected, and ensures that the sender cannot deny having sent the
message.

UPI PIN flow:

Issuer PSP App Integrated with CL

IPS System

Issuer PSP App

IPS_CL

Issuer PSP Switch

IPS_Switch

Issuer Bank Switch

Customer

IPS PIN Flow

1

Customer enters Pin
on IPS CL Page

2

IPS_CL ecrypts
IPS PIN with
(IPS HSM Public
Key) and Encodes it
with Base64encoder

3 Initiates Payment Request

4

Sends request with
cred block(encrypted
& encoded) to IPS Switch

5

IPS Switch decode
and decrypts the Cred Block
Post this it signs the cred
block with issuer bank HSM Publick key
and encodes it
with Base64encoder and sends to
issuer bank switch

6

Issuer bank Switch
decodes with base64decoder and
decrypts the Cred Block
with Issuer HSM Private Key
and take further action

Customer

Issuer PSP App

IPS_CL

Issuer PSP Switch

IPS_Switch

Issuer Bank Switch

Flow of IPS PIN during Transaction

        Technical Specification Document                               31 | P a g e

1. Customer Enters IPS PIN on the IPS CL Page within the Issuer PSP App. 2. Encrypts the entered PIN using the IPS HSM Public Key and encodes the encrypted PIN using
Base64 encoding, sends the encrypted and encoded PIN back to the Issuer PSP App. 3. Issuer PSP App initiates a Payment Request to the Issuer PSP Switch, including the encrypted and
encoded PIN (Cred Block). 4. Issuer PSP Switch forward Request to IPS Switch passing along the Cred Block. 5. IPS Switch processes it by decoding with Base64 Decoder and decrypting it with IPS HSM Private
Key. Post this it signs using the Issuer SoV Provider HSM Public Key and encodes using Base64
encoder and sends the processed block to the Issuer SoV provider Switch. 6. Issuer SoV provider Switch decodes the received block using Base64 decoder and decrypts the
block using the Issuer HSM Private Key and takes further action.

3.5. Certificate Requirement
Types of certificates are required, and they are as follows:

Sr No

Requirement

Key Length

Certification Type

1
2
3

SSL
Digital Signing
HSM Certificate

Certificates used by IPS:

RSA 2048
RSA 2028
RSA 2028

Class 3
Class 3
Class 3

Type of Certificate

Used By Shared By

Reason

SSL
Digital Signing

HSM Certificate

IPS
IPS

IPS

IPS Participant/SOV
IPS Participant/ SOV

SOV

For SSL Connection.
To verify digital signature of the XML
message.
This certificate will be used for the
encryption of the PIN and card
details.

HSM Certificate

IPS

IPS

Will be using CL library.

Certificates used by IPS Participant/ SOV:

Type of Certificate
SSL

Digital Signing

Used By
IPS
Participant/SOV
IPS
SOV

Participant/

Shared By
IPS

Reason
For SSL Connection.

IPS

To verify digital signature of the XML
message.

        Technical Specification Document                               32 | P a g e

HSM Certificate

IPS Participant

IPS

This certificate will be used for the
encryption of the PIN and card
details. This certificate will be used
by IPS participants to encrypt the
PIN, card related data and send it
to IPS.

DIGITAL SIGNATURE GUIDELINES (FOR REFERENCE ONLY)

This section provides the guidelines for generating and validating DOM based XML signatures following
JSR 105. Following is a Java sample code with instructions:

• This java tool SignatureGenUtil.java is currently configured to use RSA 2048-bit signer. And

tested in jdk 1.8 and above.

• Please change the qualified paths under main method -

qualifiedPathXMLToBeSigned, generatedSignedXML, targetSignedXML respectively pointing to
the xml to be signed, where the signed xml will be generated and path of file whose signature will
be validated.

• Please modify signer passphrase at line number 208 ('password') as required. Default is

passphrase being used in issued test doc signer.

• Please modify signer and certificate qualified path in line number 203 & 218 respectively under

init(). File signerFile = new File("D:\\signer\\signer.p12");
java.security.cert.Certificate cert = getCertificate("D:\\signer\\signer.crt");

•

Java XML Digital Signature API Specification (JSR 105) is being followed as best practice for xml
signature. hence, we are generating the xml signature on DOM.

• For any details regarding the XML canonicalization, please refer to http://www.w3.org/TR/xml-

exc-c14n/

For RSA with SHA256 following is the signature method URI http://www.w3.org/2001/04/xmldsig-
more#rsa-sha256 One may need to use any JSR 105 provider depending upon the java version used.

        Technical Specification Document                               33 | P a g e

Technical Specification Document 34 | P a g e

Technical Specification Document 35 | P a g e

Technical Specification Document 36 | P a g e

Sample XML request with Digital Signature:

Hit URI: https://<Source IP>/upi/ReqPay/2.0/urn:txnid:ABCef6fdfde87454cc084071ca3725e2979

msgId="YBL4a69d250abe6433899c2f5a08fc0d008"

Received Message:<?xml version="1.0" encoding="UTF-8"?>
<ns2:ReqPay xmlns:ns2="http://npci.org/upi/schema/">

<Head
ts="2017-05-
11T00:00:41+05:30" ver="2.0"/>
<Txn custRef="713100747891" id="YBLef6fdfde87454cc084071ca3725e2979"
note="Payment" refId="P1705110000338829715467"
refUrl="http://www.npci.org.in/"
type="PAY"/>
<Payer addr="ani@mypsp1" code="0000" name="ANI" seqNum="1" type="PERSON">

ts="2017-05-11T00:00:41+05:30"

orgId="910001"

<Info>

<Identity id="12345678901234567" type="ACCOUNT"
verifiedName="ANI"/>
<Rating verifiedAddress="TRUE"/>

</Info>
<Device>

<Tag name="MOBILE" value="9898989898"/>
<Tag name="GEOCODE" value="25.4870,81.8727"/>
<Tag name="IP" value="106.219.54.221"/>
<Tag name="LOCATION" value="Mumbai, IN"/>
<Tag name="TYPE" value="MOB"/>
<Tag name="OS" value="Android"/>
<Tag name="APP" value="com.psp.app"/>
<Tag name="CAPABILITY"
value="5200000200000005600179648301605"/>
<Tag name="ID" value="1B682WNVAQSSKSOBQMDG"/>

</Device>
<Ac addrType="ACCOUNT">

<Detail name="IFSC" value="QAZX0001501"/>
<Detail name="ACNUM" value="12345678901234567"/>

        Technical Specification Document                               37 | P a g e

<Detail name="ACTYPE" value="SAVINGS"/>

</Ac>
<Creds>

<Cred subType="MPIN" type="PIN">
<Data code="NPCI" ki="20150822">2.0</Data>
</Cred>

</Creds>
<Amount curr="NAD" value="100.00"/>

</Payer>
<Payees>

<Payee addr="test@mypsp2" code="0000" name="Test user" seqNum="1"
type="PERSON">

<Info>
<Identity
verifiedName="Test user"/>
<Rating verifiedAddress="TRUE"/>
</Info>

id="12345678901234111"

<Ac addrType="ACCOUNT">

type="ACCOUNT"

<Detail name="IFSC" value="AXCA0851600"/>
<Detail name="ACNUM" value="12345678901234111"/>
<Detail name="ACTYPE" value="SAVINGS"/>

</Ac>
<Amount curr="NAD" value="100.00"/>

</Payee>

</Payees>
<Signature xmlns="http://www.w3.org/2000/09/xmldsig#">

<SignedInfo>

<CanonicalizationMethod
Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>
<SignatureMethod  Algorithm="http://www.w3.org/2001/04/xmldsig-
more#rsasha256"/>

<Reference URI="">

<Transforms>

<Transform

Algorithm="http://www.w3.org/2000/09/xmldsig#envelopedsignature"
/>

</Transforms>

<DigestMethod
Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>

<DigestValue>d7c8r4DwxkC+XD+B+fqH27Zvdy5JhJPMiU9kbvPlSZE=<

/DigestValue>

</Reference>
</SignedInfo>

<SignatureValue>WS2WY36wk/wkptfS3gaYoqXGJ/n/jYGTTwOOZZ8y2xnnP2X/vO
sTNyk9UQx+jjRyp+zkHmPbCEQmwZXu/z1qzGqvmgac6So1d9iEo6gGyBSbs+r3qV4M
qTMQVooRAJ7RN1qnU6hvL/+aKNsrLzHIACHnmLW6wQoDRtVGX/2raGW08cB74VI8ZB
b8t7fhTMYrK5zvPyZK33u5J2qUDz24gVvx0WAsVDM2QJQ+2svLyUUxRdxghMTHeZeD
Hiq/quM46sngjnj+TqPghwYNST+ofB5MjaMbysJIJY5s8Z7URnJ5B JUZ

        Technical Specification Document                               38 | P a g e

zXKE91mPaCghCH9HoVooEgOTsZ9mVrBGUrjDMQ==</SignatureValue>

<KeyInfo>

<KeyValue>

<RSAKeyValue>

<Modulus>vT5CxuS4WVHnDQPb4VEMB7EnaPcBJ73pKP127ACIsN
3HEgJw0kil+WQZaAmDQ6sJT5Q1gfAbvDAUZa43Ya3gOYC34yNt8M
sXF7Aw10F936sVxsCAdYtJ2/j7Ir+Br6BkOP0ovfg8l4r+MA61HX
TWehwN4QFLZjCMUIaSQ13029aobgvVdB+wc3oU9pdWA004wZxD1e
gbCefO+6Po+GrpETUTGm+scBYu+e06x37JfuimWNbQyph5dmnOmH
O0KjdhJQIpgw8ck7LK9YWn/DWRkK2M20jLI+QFKCJhpKUkIIdwbJ
WRNJgePAOrLMdTBp1doAf2HKiZ/ZQf7IfDyyDyQ==</Modulus>
<Exponent>AQAB</Exponent>

</RSAKeyValue>

</KeyValue>

</KeyInfo>

</Signature>
</ns2:ReqPay>

3.6. Security Considerations

IPS Solution provides strong end-to-end security and data protection. To maintain security and
authenticity of the transactions, all API messages are generated with a digital signature by the sender
which is validated by the receiver. Encryption / Decryption at IPS will be performed through the
Hardware Security Module (HSM). Message communication between IPS Participant and IPS will be in
XML format over HTTPS and all the messages will be digitally signed using RSA-SHA256.
For storing the data at IPS participant end, IPS participant needs to follow security standard applicable
to them. IPS will support TLS 1.2 and above.
Signer certificate will be used for the message signing and validation.
The SSL certificate will be used for Secure TLS communication.
HSM certificates will be used for IPS PIN.

Common Library is a set of utilities which are embedded in the PSP App. This library is available for all
major mobile operating systems viz. Android, iOS.
These libraries allow secure capture of credentials like OTP, PIN, etc. The secured credentials are
always captured by the IPS common library which uses Public Key Infrastructure (PKI) Encryption.
IPS will be using PKI to encrypt the PIN using IPS Public Key which will be stored locally in the library.
This encrypted block will be sent to IPS where IPS will decrypt using IPS Private Key.
Then IPS will encrypt it using the Issuer’s Public Key and send it to the issuing bank which will decrypt
& validate with its Private Key. The Issuer Bank has to mandatorily decrypt the PIN and/or any other data
using HSM only.
For data security, the following classes of information are defined:

1.  Sensitive Data - Data such as PIN, passwords etc. are not to be stored and should be

transported in encrypted form.

        Technical Specification Document                               39 | P a g e

2. Private Data - Data such as SOV Account numbers. This information may be stored by the IPS

Participant, but only in encrypted form.

3.  Non-Sensitive data - Name, transaction history (amount, timestamp, response code,

location, etc.) can be stored in unencrypted form.

3.7.

Identity & Account Validation

The following identity data needs to be validated in the messages to ensure trust in the system. In case
the data has not been validated, it must be indicated:

Identity Data

Validated By

When

How

Mobile Number

IPS Participant
Originator

Customer Registration
Account Registration

Customer Name

IPS Participant

Customer Registration

Account Details -
Number, Account
Ownership,

IPS Participant using
the issuer credentials
(captured via common
library)

Every time a payment
account is added

Using OTP
During first
transaction
National ID KYC or
Bank debit card
details verification
or any other KYC
verification
During first
transaction

3.7.1. Protecting Account Details

1.  IPS Participants are mandated to use a secure protocol when transmitting sensitive data

such as account details from the device to the IPS Participant server.

2.  IPS Participants are mandated to safeguard account information within IPS Participant
    system as per regulatory and the payment card industry (when storing card details)
    compliance standards.

3.7.2. Protecting Authentication Credentials

1.  Trusted common library for credential (IPS-PIN/ATMPIN etc.) capture is provided by IPS.

This library needs to be integrated with an IPS Participant application.

2.  Authentication credentials are captured and encrypted within the common library. IPS
    Participant should not capture issuer specific authentication credentials outside the
    common library.

3.  The encrypted credentials are base64 encoded by the common library and given back to

IPS Participant application for subsequent transports through IPS.

4.  IPS Participant should not log, or store encrypted credentials within any permanent

storage.

        Technical Specification Document                               40 | P a g e

3.7.3. Protecting against Phishing

The following techniques may be used to protect against phishing:

1.  IPS participants should ensure that their applications have anti phishing protection.
2.  IPS participants should also have adequate awareness programs for their customers.

Message Security, Trust, and Non-Reputability

1.  Every message within the unified system must be digitally signed.
2.  Every message has a unique transaction ID (that spans across the organizations for the same

transaction) and a unique message ID for every request-response pair.

3.  All APIs must be done over a secure channel (HTTPS).
4.  Auditing transaction (no sensitive data) data as per the regulatory requirements.

3.8. Registration Flow

3.8.1. Device Binding

Steps involved in Device Binding:

1.  The user opens the IPS-enabled PSP app and provides explicit consent to initiate device registration

for IPS services.

2.  The IPS Participant PSP app sends a device registration request to the IPS Participant Switch. This

request includes device-specific metadata such as:

- Manufacturer
- Device ID
- Model
- OS and version

3.  The IPS Participant Switch processes the request and responds with a registration token, along

with:

“sms_content”: a pre-formatted SMS message
“sms_vmn”: a Virtual Mobile Number (VMN) to which the SMS should be sent

Note: The registration token is securely stored by the PSP Switch and temporarily cached by the IPS
Participant app.

        Technical Specification Document                               41 | P a g e

4. The IPS Participant app automatically sends the `sms_content` to the provided `sms_vmn` using

the device’s SMS service.

5.  The SMS is routed through the SMS Provider, which connects to the Telco Network to deliver the

message.

6.  The SMS Provider forwards the received `sms_content` along with the mobile number of the device

(retrieved from the network) to the IPS Participant Switch.

7.  The IPS Participant Switch validates the received SMS content and matches it with the previously
    issued registration token. Upon successful validation, the device is bound to the mobile number
    and registered for IPS services.

8.  The IPS Participant app receives confirmation of successful device binding and displays a

successful screen to the user.

3.8.2. Alias Creation at IPS Participant PSP

Steps for creation of full form of alias:

1.  The user opens the IPS-enabled PSP app, where the app either displays a list of suggested

aliases or allows the user to manually enter a preferred alias.

2.  Once the user selects or enters a full form of alias, the IPS Participant app initiates a internal

API request to the IPS Participant Switch to check the availability of the entered alias.

        Technical Specification Document                               42 | P a g e

3. IPS Participant switch checks whether the alias is present in their system or not, if not

available means alias is available for the user.

4.  The IPS Participant app notifies the user that the alias has been successfully created and
    prompts the user to select a SoV provider where they hold an account to link with the newly
    created alias.

5.  Further in later step the list of available SoV providers is fetched using the “ReqListAccPvd”
    API by the IPS Participant Switch, which helps the user choose the appropriate SoV provider
    for account linking.

3.8.3. Listing Accounts

Steps for Listing of Account for created alias:

1.  PSP User selects the bank in which the user has an account in the PSP App.
2.  PSP App calls the account listing API to the IPS Participant Switch.
3.  IPS Participant Switch calls the `ReqListAccount` API to the IPS Switch with link type **“MOBILE”**
    and the selected bank IFSC in the account tag.
4.  IPS Switch acknowledges the `ReqListAccount` request to the IPS Participant Switch.
5.  IPS Switch sends the `ReqListAccount` request to the User Bank.
6.  User Bank acknowledges the `ReqListAccount` request to the IPS Switch.
7.  User Bank sends the `RespListAccount` response to the IPS Switch.
8.  IPS Switch acknowledges the `RespListAccount` response to the User Bank.
9.  IPS Switch sends the `RespListAccount` response to the IPS Participant Switch, including:
    -Account type(SAVINGS, BASIC, WALLET, )
    -mbeba flag (Indicates whether PIN set or not SoV provider)

        Technical Specification Document                               43 | P a g e

-aeba flag (Indicates whether National ID stored at SoV end )
-Masked account number
-dtype and dlength for OTP/PIN type and length configuration 10. IPS Participant Switch acknowledges the `RespListAccount` response to the IPS Switch. 11. IPS Participant Switch sends the API response to the PSP App. 12. PSP App displays to the PSP User:
-Bank name
-Last N digits of account number
-Type of account
-User name
-mbeba value
-aeba value
Note:
•

If the mbeba flag value is “N”, it means the IPS PIN is not set and proceed with the Set PIN
journey. The value “Y” means the IPS pin is already set by the user.

• National Id will also be returned by the

issuing bank, only

if National Id consent

•

(aadhaarConsent field=”Y”) is given by the customer.
IPS will send only the masked National Id number (last 6 digits of National Id number) to the list
account initiating PSP. If ‘aeba’ flag is Y, and if masked National Id number is returned then the
PSP app will ask the customer to input the last 6 digits of National Id number and verify it against
the masked National Id number provided by IPS to allow customer to set/reset IPS PIN.

        Technical Specification Document                               44 | P a g e

3.8.4. Set/Reset IPS PIN (Using Card- For Account)

Set IPS PIN - Using Debit Card for account

PSP_User

Create IPS PIN

PSP_App

IPS_Participant_Switch

IPS_Switch

User_Bank

1

once user shown as
"IPS PIN not avilable"
based on mbeba flag

2 ReqOTP request initiated

3 ReqOTP request signed and sent to IPS switch

4 Ack for ReqOTP Sent

7 RespOTP with "SUCCESS" response sent

8 Ack for RespOTP is been sent

5 ReqOTP request sent to bank

6 Ack for ReqOTP Sent

9 Bank sends OTP to User device via telecom network

10 Opens CL screen

received OTP is auto fetched
and then ask for card last n digits,
pin,expiry date and then it asks for
IPS PIN which needs to be created
for transaction authorization

11

Considering captured data
on CL Screen \ReqRegMob initiated

12 ReqRegMob signed request sent to IPS switch

13 Ack for ReqRegMob Sent

14 ReqRegMob signed request sent to Bank switch

15 Ack for ReqRegMob Sent

IPS PIN Stored at Bank

16 OTP,Card details validated

17

RespregMob sent to IPS
switch with "SUCCESS" response

18 Ack for RespRegMob Sent

21 IPS Pin set successfully

20

Based on response received
PSP App shows UI

19 RespRegMob sent with success response

PSP_User

PSP_App

IPS_Participant_Switch

IPS_Switch

User_Bank

Sequential Flow Diagram-IPS PIN Creation

Steps for the IPS PIN creation:

1.  PSP User sees the message “IPS PIN not available” on the PSP App based on the mbeba flag.
2.  PSP App initiates a `ReqOTP` request to the IPS Participant Switch.
3.  IPS Participant Switch signs and sends the `ReqOTP` request to the IPS Switch.
4.  IPS Switch acknowledges the `ReqOTP` request to the IPS Participant Switch.
5.  IPS Switch sends the `ReqOTP` request to the User Bank.
6.  User Bank acknowledges the `ReqOTP` request to the IPS Switch.
7.  IPS Switch sends a `RespOTP` response with “SUCCESS” to the IPS Participant Switch.
8.  IPS Participant Switch sends an acknowledgement for RespOTP request received from IPS switch.
9.  User Bank sends the OTP to the PSP User’s device via the telecom network.
10. PSP App opens the Card Linking (CL) screen.
    Note: The OTP is auto fetched, and the app asks for card last N digits, PIN, expiry date, and then
    prompts the user to create an IPS PIN for transaction authorization.
    The entered data above will be encrypted by CL using the IPS HSM public key and encoded with the
    Base64 encoder.
11. PSP App initiates a `ReqRegMob` request considering the captured data on the CL screen.
12. IPS Participant Switch signs and sends the `ReqRegMob` request to the IPS Switch.
    Note: IPS switch decode the data (In Cred Block) using Base64 Decoder and decrypted using the IPS
    HSM Private Key. Again, the data will be encrypted using Issuer HSM public key and encoded with
    Base64 encoder.
13. IPS Switch acknowledges the `ReqRegMob` request to the IPS Participant Switch.

        Technical Specification Document                               45 | P a g e

14. IPS Switch sends the signed `ReqRegMob` request to the User Bank.
Note: Issuer banks decode the encrypted data (In Cred Block) using Base64 Decoder and decrypt the
data using Issuer HSM Private key and validate. 15. User Bank acknowledges the `ReqRegMob` request to the IPS Switch. 16. User Bank validates OTP and card details.
Note: IPS PIN is stored at the bank. 17. User Bank sends a `RespRegMob` response with “SUCCESS” to the IPS Switch. 18. IPS Switch acknowledges the `RespRegMob` response to the User Bank. 19. IPS Switch sends the `RespRegMob` response with success status to the IPS Participant Switch. 20. IPS Participant Switch sends the response to the PSP App, which updates the UI. 21. PSP App displays “IPS PIN set successfully” to the PSP User.

3.8.5. Set/Reset IPS PIN (Using National ID - For Account)

Set IPS PIN-Using National ID for Account

PSP_User

Create IPS PIN using National ID

Account/SoV Linkage

1

User selects Sov provider
in which user has an account and provides
consent for fetching National ID enabled OTP

PSP_App

IPS_Participant_Switch

IPS_Switch

User_Bank

MNO_NID_Auth

2 App calls for account listing API

3

ReqListAccount API called with
link "MOBILE" and in account
tag selected bank IFSC and
NationalID consent(aadhaarConsent="Y")

4 Ack for ReqListAccount request sent

5 ReqListAccount request sent to bank

6 Ack for ReqListaccount request sent

7

RespListAccount sent by bank
(accType,mbeba flag,aeba flag, masked account
number and dtype, dlength for
OTP,PIN,National ID 11 digit,
NationalID consent(aadhaarConsent="Y"))

8 Ack for RespListAccount Sent

9

RespListAccount sent by Switch
(accType,mbeba flag,aeba flag, masked account
number and dtype, dlength for
OTP,PIN,National ID 6 digit,
NationalID consent(aadhaarConsent="Y"))

10 Ack for RespListAccount Sent

12

User shown with bankname,last n digits of
account number, account name, and based on mbeba
flag app to shown option as Set or Reset
pin based on mbeba field value

OTP Request Initiation

13

User selects NationalID (based on aeba="Y")
based Set/Reset UPI PIN and
enters 11 digit NationalID on App

11 API response sent to App

User has shown option to
select Set or Reset Pin option

14

PSP App verifies the last 6 digits
of national ID and initiates OTP request

15 ReqOTP request signed and sent to IPS switch

16 Ack for ReqOTP Sent

17

Request initiated to MNO to
verify NationalID and mobile number

18 Response received from MNO

19 ReqOTP initiated to user bank

20 Ack for ReqOTP Sent

21 RespOTP initiated by user bank

22 Ack sent to user bank for RespOTP

25 Bank sends OTP to User device via telecom network

Final Registration Call

27

User able to view CL Screen and
enters details for registration

26

Post receiving response
for OTP, Initiates CL call

received OTP is auto fetched
and asks user to enter IPS PIN

28

Considering captured data on CL
Screen registration request initiated

23 RespOTP with "SUCCESS" response sent

24 Ack sent for RespOTP

29

ReqRegMob initiatd along with
OTP and PIN signed request sent to IPS switch

30 Ack for ReqRegMob Sent

37

Based on response received
PSP App shows UI

35 RespRegMob sent with success response

36 Ack for RespRegMob sent

38 IPS Pin set successfully

PSP_User

PSP_App

IPS_Participant_Switch

IPS_Switch

User_Bank

MNO_NID_Auth

31

ReqRegMob initiated with OTP
& IPS Pin - signed request
sent to Bank switch

32 Ack for ReqRegMob Sent

33

RespregMob sent to IPS
switch with "SUCCESS" response

34 Ack for RespRegMob Sent

IPS PIN Stored at Bank

        Technical Specification Document                               46 | P a g e

1. User Interface triggers SoV provider selection and consent for National ID-based OTP retrieval. 2. PSP Application invokes the Account Listing API to the IPS Participant switch. 3. IPS Participant Switch forwards the request with required parameters (mobile link, IFSC, National
ID consent) to IPS Switch. 4. IPS Switch acknowledges the account listing request. 5. IPS Switch routes the request to the designated User Bank. 6. User Bank acknowledges receipt of the account listing request. 7. User Bank responds with account metadata including flags, masked account number, and
National ID attributes. 8. IPS Switch sends acknowledgement for the account response to the bank. 9. IPS Switch forwards the account response to the IPS Participant Switch with updated National ID
format. 10. IPS Participant Switch acknowledges the response from IPS Switch. 11. IPS Participant Switch returns the account listing response to the PSP Application. 12. PSP Application renders account details and PIN setup options to the user. 13. User Interface displays Set/Reset PIN option based on account flags. 14. User Interface captures National ID input and triggers Set/Reset PIN flow. 15. PSP Application validates last 6 digits of National ID received from IPS Switch and initiates OTP
request to IPS Participant Switch.
Note: If PSP application fails to validate the National ID entered by user then PSP App shows the
relevant error to the PSP User and should not initiate OTP request. 16. IPS Participant Switch sends signed OTP request to IPS Switch. 17. IPS Switch acknowledges the OTP request. 18. IPS Switch initiates identity verification with the MNO/NID(National ID) Authentication service. 19. MNO/NID(National ID) Auth Service returns verification result to IPS Switch.
Note: If IPS Switch didn’t receive successful response from MNO service, no OTP request will be
initiated to issuer and IPS Switch must send response for OTP request as “failure”. 20. IPS Switch initiates OTP request to the User Bank. 21. User Bank acknowledges the OTP request. 22. User Bank sends OTP response to IPS Switch. 23. IPS Switch acknowledges the OTP response to the bank. 24. IPS Switch forwards OTP response with success status to IPS Participant Switch. 25. IPS Participant Switch acknowledges the OTP response. 26. User Bank delivers OTP to the user via telecom network. 27. IPS Participant Switch triggers Customer Login (CL) screen on the PSP Application. 28. User Interface displays CL screen for user to enter registration details. 29. User Interface auto-fetches OTP and prompts user to enter IPS PIN.
Note: The entered data above will be encrypted by CL using the IPS HSM public key and encoded with
the Base64 encoder. 30. PSP Application sends registration request with captured data to IPS Participant Switch. 31. IPS Participant Switch sends signed registration request (`ReqRegMob`) with OTP and PIN to IPS
Switch. 32. IPS Switch acknowledges the registration request.
Note: IPS switch decode the data (In Cred Block) using Base64 Decoder and decrypted using the IPS
HSM Private Key. Again, the data will be encrypted using Issuer HSM public key and encoded with
Base64 encoder. 33. IPS Switch forwards the registration request to the User Bank. 34. User Bank acknowledges the registration request.

        Technical Specification Document                               47 | P a g e

Note: Issuer banks decode the encrypted data (In Cred Block) using Base64 Decoder and decrypt the
data using Issuer HSM Private key and validate. 35. User Bank sends successful registration response (`RespRegMob`) to IPS Switch. 36. IPS PIN is securely stored at the User Bank. 37. IPS Switch acknowledges the registration response to the bank. 38. IPS Switch → IPS Participant Switch → PSP Application → User Interface: Final response propagated
confirming successful IPS PIN setup.

3.8.6. Set/Reset IPS PIN (Using WALLET PIN – For Wallet)

Set IPS PIN - Using Wallet Pin for Wallet

PSP_User

Create IPS PIN using Wallet Pin

Wallet Linkage

PSP_App

IPS_Participant_Switch

IPS_Switch

User_Bank

1

User selects Sov provider
in which user has Wallet and provides
consent for fetching Wallet related details

2 App calls for account listing API

3

ReqListAccount API called with
linked "MOBILE"

4 Ack for ReqListAccount request sent

5 ReqListAccount request sent to bank

6 Ack for ReqListaccount request sent

7

RespListAccount sent by bank
(accType,mbeba flag,aeba flag, masked account
number and dtype, dlength for
OTP,PIN)

8 Ack for RespListAccount Sent

9

RespListAccount sent by Switch
(accType as "WALLET",mbeba flag,aeba flag, masked account
number and dtype, dlength for
OTP,PIN)

10 Ack for RespListAccount Sent

15 ReqOTP request signed and sent to IPS switch

16 Ack for ReqOTP Sent

21 RespOTP with "SUCCESS" response sent

22 Ack sent for RespOTP

17 ReqOTP initiated to user bank

18 Ack for ReqOTP Sent

19 RespOTP initiated by user bank

20 Ack sent to user bank for RespOTP

12

User shown with wallet details
app to show option as Set or Reset
pin based on mbeba field value

OTP Request Initiation

13 User selects WALLET to set IPS PIN

11 API response sent to App

User has to show option to
select Set or Reset Pin option

14 PSP App initiates an OTP request

23

Issuer sends OTP to User
device via telecom network

Final Registration Process

25

User able to view CL
Screen and enters Wallet
Pin details for registration

24

Post receiving response
for OTP, Initiates CL call

received OTP is auto fetched
and asks user to enter IPS PIN

26

Considering captured data on CL
Screen registration request initiated

27

ReqRegMob initiatd along with
wallet Pin, OTP and IPS PIN(to be set)
signed request sent to IPS switch

28 Ack for ReqRegMob Sent

33 RespRegMob sent with success response

34 Ack for RespRegMob sent

29

ReqRegMob initiated with
wallet pin, OTP & IPS Pin

- signed request sent to Bank switch

30 Ack for ReqRegMob Sent

31

RespregMob sent to IPS
switch with "SUCCESS" response

32 Ack for RespRegMob Sent

IPS PIN Stored at Bank

36 IPS Pin set successfully

35

Based on response received
PSP App shows UI

PSP_User

PSP_App

IPS_Participant_Switch

IPS_Switch

User_Bank

WALLET Linkage

1.  User selects SoV provider in which user has Wallet and provides consent for fetching Wallet related
    details via PSP App.
2.  PSP App initiates account listing API call to IPS Participant Switch.

        Technical Specification Document                               48 | P a g e

3. IPS Participant Switch sends `ReqListAccount` with linked "MOBILE" to IPS Switch. 4. IPS Switch acknowledges `ReqListAccount` request to IPS Participant Switch. 5. IPS Switch forwards `ReqListAccount` request to User Bank. 6. User Bank acknowledges `ReqListAccount` request to IPS Switch. 7. User Bank sends `RespListAccount` with appropriate details to IPS Switch.
Note: The masked account number and account reference number will consist of mobile number in
case accType as WALLET. 8. IPS Switch acknowledges `RespListAccount` to User Bank. 9. IPS Switch sends `RespListAccount` to IPS Participant Switch with. 10. IPS Participant Switch acknowledges `RespListAccount` to IPS Switch. 11. IPS Participant Switch sends API response to PSP App. 12. PSP App shows wallet details to user and displays Set or Reset PIN option based on `mbeba`
field. 13. User sees option to Set or Reset PIN.

OTP Request Initiation 14. User selects WALLET to set IPS PIN. 15. PSP App initiates OTP request to IPS Participant Switch. 16. IPS Participant Switch sends signed `ReqOTP` to IPS Switch. 17. IPS Switch acknowledges `ReqOTP` to IPS Participant Switch. 18. IPS Switch sends `ReqOTP` to User Bank. 19. User Bank acknowledges `ReqOTP` to IPS Switch. 20. User Bank sends `RespOTP` to IPS Switch. 21. IPS Switch acknowledges `RespOTP` to User Bank. 22. IPS Switch sends `RespOTP` with "SUCCESS" response to IPS Participant Switch. 23. IPS Participant Switch acknowledges `RespOTP` to IPS Switch. 24. Issuer (User Bank) sends OTP to user device via telecom network. 25. IPS Participant Switch initiates CL call to PSP App. 26. PSP App shows CL screen to user for PIN entry. 27. User enters Wallet PIN and IPS PIN on CL screen.
Note: OTP received is auto-fetched. The entered data will be encrypted using IPS HSM public key
and encoded with Base64 encoder.

Final Registration Process 28. PSP App sends registration request to IPS Participant Switch with captured CL screen data. 29. IPS Participant Switch sends signed `ReqRegMob` to IPS Switch with Wallet PIN, OTP, and IPS
PIN. 30. IPS Switch acknowledges `ReqRegMob` to IPS Participant Switch.
Note: IPS Switch decodes the data (Cred Block) using Base64 Decoder and decrypts using IPS HSM
Private Key. Then re-encrypt using Issuer HSM public key and encodes with Base64 encoder. 31. IPS Switch sends `ReqRegMob` to User Bank. 32. User Bank acknowledges `ReqRegMob` to IPS Switch.
Note: Issuer Bank decodes encrypted data (Cred Block) using Base64 Decoder and decrypts using
Issuer HSM Private Key for validation. 33. User Bank sends `RespRegMob` with "SUCCESS" response to IPS Switch. 34. IPS PIN is securely stored at Issuer Bank. 35. IPS Switch acknowledges `RespRegMob` to User Bank. 36. IPS Switch sends `RespRegMob` to IPS Participant Switch → PSP App → User (IPS PIN setup

        Technical Specification Document                               49 | P a g e

successful).

3.8.7. Change IPS PIN

Steps for changing the IPS PIN process:

1.  PSP User selects the account and clicks on “Change IPS PIN” in the PSP App.
2.  PSP App opens the Card Linking (CL) screen by invoking the client library method and displays
    fields for the user to enter the old IPS PIN, On the next CL screen, the PSP App asks for the new IPS
    PIN.
    Note: App calls CL with `credType=changeMPIN`.
    Note: The entered data above will be encrypted by CL using the IPS HSM public key and encoded
    with the Base64 encoder.
3.  PSP App initiates a Change IPS PIN request with both old and new IPS PIN values to the PSP
    Switch.
4.  PSP Switch signs and sends the `ReqSetCred` request to the IPS Switch.
    Note: IPS switch decode the data (In Cred Block) using Base64 Decoder and decrypted using the IPS
    HSM Private Key. Again, the data will be encrypted using Issuer HSM public key and encoded with
    Base64 encoder.
5.  IPS Switch acknowledges the `ReqSetCred` request to the PSP Switch.
6.  IPS Switch sends the `ReqSetCred` request to the User Bank.
    Note: Issuer banks decode the encrypted data (In Cred Block) using Base64 Decoder and decrypt the
    data using Issuer HSM Private key and validate.
7.  User Bank acknowledges the `ReqSetCred` request to the IPS Switch.
8.  User Bank validates the old IPS PIN and, after successful validation, updates the new IPS PIN in its
    system.
9.  User Bank sends a `RespSetCred` response with “SUCCESS” to the IPS Switch.

        Technical Specification Document                               50 | P a g e

10. IPS Switch acknowledges the `RespSetCred` response to the User Bank. 11. IPS Switch sends the `RespSetCred` response with “SUCCESS” to the PSP Switch. 12. PSP Switch acknowledges the `RespSetCred` response to the IPS Switch. 13. PSP Switch sends the success response to the PSP App. 14. PSP App displays “PIN changed successfully” to the PSP User.

3.9. Direct Pay (Sender/Payer initiated)
In this flow, the payer initiates a payment transaction, while specifying the recipient. There are 2 sub-
flows – when the sender is an individual, or a system (presumably a company).

3.9.1. Person Initiated
The sender uses an application to send money to a receiver by providing sender credentials and
receiver/beneficiary “alias”. For ex. to pay a friend via a mobile banking application.

3.9.2. System Initiated
The sender system initiates payment, using a digitally signed request. For example, the system generates
a daily commission payment to users.

3.9.3. Transaction Flow

3.9.3.1 Validate Payee VPA

Payer

Verification of Address

Payer PSP App

Payer PSP Participant Switch

IPS_Switch

Payee PSP Participant Switch

1

Sender open UPI App and
select or enter the VPA/Alias
of payee/beneficiary/receiver

2

Payer PSP App initiates the
Validate Request to the Payer PSP Switch

3

Payer PSP Switch initiates
ReqValAdd request to verify
the payee/beneficiary/
receiver's VPA/alias

4 Ack sent for ReqValAdd

9

RespValAdd sent "Payer PSP Participant
Switch" consisting receiver's name

10 Ack sent to IPS_Switch for RespValAdd

5

ReqvalAdd request sent
to Payee PSP Switch

6 Ack sent to IPS_Switch for ReqValAdd

7 RespValAdd sent as response to IPS_Switch

8 Ack sent to Payee PSP Switch for RespValAdd

12

Payer verifies name of the
receiver shown on screen

11 Response sent to Payer Application

Payer

Payer PSP App

Payer PSP Participant Switch

IPS_Switch

Payee PSP Participant Switch

Sequential Flow Diagram - Validate Alias

1.  Payer launches the IPS application and selects or enters the alias of the intended payee.
2.  Payer PSP App initiates a validation request to the Payer IPS Partcipant Switch for the entered alias.
    3.Payer IPS Participant Payer Switch sends a `ReqValAdd` request to the IPS Switch to validate the
    payee's alias.
3.  IPS Switch acknowledges the `ReqValAdd` request and sends an acknowledgment to the Payer

        Technical Specification Document                               51 | P a g e

IPS Participant Switch. 5. IPS Switch forwards the `ReqValAdd` request to the Payee IPS Participant Switch for alias
verification. 6. Payee IPS Participant Switch acknowledges the request and sends an acknowledgment to the IPS
Switch. 7. Payee IPS Participant Switch sends a `RespValAdd` response to the IPS Switch containing the
payee's name and other details. 8. IPS Switch acknowledges the `RespValAdd` response to the Payee IPS Participant Switch. 9. IPS Switch forwards the `RespValAdd` response to the Payer IPS Participant Switch, including the
receiver's name. 10. Payer IPS Participant Switch acknowledges the response to the IPS Switch. 11. Payer IPS Participant Switch sends the response to the Payer PSP App. 12. Payer PSP App displays the receiver's name to the payer for verification.

3.9.3.2 Validate Payee Mobile Number

Payer

Validate mobile number

1

Payer enters payee mobile
number in Payer PSP App

Payer PSP App

Payer PSP Participant Switch

IPS_Switch

IPS_Alias_Directory

Payee PSP Participant Switch

2

Payer PSP app sends
the "Validate Mobile No." request
(with payee mobile number)
to payer PSP switch

3

Payer PSP switch sends
the request ReqValAdd
to IPS Switch along with Mobile No.

4 Ack sent for ReqValAdd

5

IPS_Switch queries the IPS_Alias_Directory
to fetch the details based on
Mobile Number and fetches the linked VPA

6

IPS Switch initiates the
ReqValAdd to Payee_PSP_Switch
based on fetched VPA from Directory

7 Ack sent for ReqValAdd

8

RespValAdd sent to IPS_Switch along
with Payee name assocaited with VPA

9 Ack sent for RespValAdd

13 Payer PSP App display user name on App

12

Payer Switch forwards
response to Payer PSP App

10 RespValAdd sent to Payer_PSP_Switch along with Name and mobile number

11 Ack sent for RespValAdd to Payer_PSP_Switch

Payer

Payer PSP App

Payer PSP Participant Switch

IPS_Switch

IPS_Alias_Directory

Payee PSP Participant Switch

Sequential Flow Diagram - Validate Payee Mobile Number

1.  Payer enters the payee's mobile number in the Payer IPS Participant App.
2.  Payer IPS Participant App sends a mobile number validation request to the Payer IPS Participant
    Switch.
3.  Payer IPS Participant Switch sends a `ReqValAdd` request to the IPS Switch with the mobile
    number.
4.  IPS Switch acknowledges the request and sends an acknowledgment to the Payer IPS Participant
    Switch.
5.  IPS Switch queries the IPS Alias Directory to resolve the mobile number and retrieve the linked
    alias.
6.  IPS Switch sends a `ReqValAdd` request to the Payee IPS Participant Switch using the resolved
    alias.
7.  Payee IPS Participant Switch acknowledges the request to the IPS Switch.
8.  Payee IPS Participant Switch sends a `RespValAdd` response to the IPS Switch with the payee's
    name and other details associated with the alias.

            Technical Specification Document                               52 | P a g e

9. IPS Switch acknowledges the response to the Payee IPS Participant Switch. 10. IPS Switch forwards the `RespValAdd` response to the Payer IPS Participant Switch, including the
payee's name and mobile number and other details. 11. Payer IPS Participant Switch acknowledges the response to the IPS Switch. 12. Payer IPS Participant Switch forwards the response to the Payer IPS Participant App. 13. Payer IPS Participant App displays the payee's name to the payer for confirmation.

3.9.3.3 Validate Merchant ID (8-Digits)

Payer

1 Enter Merchant ID on App

Sequential Flow Diagram - Validate Merchant ID(8 Digits)

Payer PSP App

Payer PSP Participant Switch

IPS Switch

IPS Alias Directory

Payee PSP Participant Switch

2 Send Validate Merchant ID request

Validate Merchant ID

3 Send ReqValAdd with Merchant ID

4 Ack for ReqValAdd

5

Query IPS Alias Directory
(resolve Merchant ID to alias)

6 Return linked alias

7 Send ReqValAdd using resolved alias

8 Ack for ReqValAdd

9 Send RespValAdd with Merchant name and details

10 Ack for RespValAdd

14 Display Merchant name for confirmation

13 Forward response

11

Forward RespValAdd (Merchant name
, Merchant ID, Relevant details)

12 Ack for RespValAdd

Payer

Payer PSP App

Payer PSP Participant Switch

IPS Switch

IPS Alias Directory

Payee PSP Participant Switch

1.  Payer enters the Merchant ID on the Payer PSP App.
2.  Payer PSP App sends a Merchant ID validation request to the Payer PSP Participant Switch.
3.  Payer PSP Participant Switch sends a ReqValAdd request to the IPS Switch with the Merchant ID.
4.  IPS Switch acknowledges the request and sends an acknowledgment to the Payer PSP Participant
    Switch.
5.  IPS Switch queries the IPS Alias Directory to resolve the Merchant ID and retrieve the linked alias.
6.  IPS Alias Directory returns the linked alias to the IPS Switch.
7.  IPS Switch sends a ReqValAdd request to the Payee PSP Participant Switch using the resolved
    alias.
8.  Payee PSP Participant Switch acknowledges the request to the IPS Switch.
9.  Payee PSP Participant Switch sends a RespValAdd response to the IPS Switch with the Merchant
    name and other details associated with the alias.
10. IPS Switch acknowledges the response to the Payee PSP Participant Switch.
11. IPS Switch forwards the RespValAdd response to the Payer PSP Participant Switch, including the
    Merchant name, Merchant ID, and other relevant details.
12. Payer PSP Participant Switch acknowledges the response to the IPS Switch.
13. Payer PSP Participant Switch forwards the response to the Payer PSP App.
14. Payer PSP App displays the Merchant name to the payer for confirmation.

        Technical Specification Document                               53 | P a g e

3.9.3.4 Payment flow:

PSP_User

Payer_PSP

Payer_Participant_Switch

Remitter_Bank

IPS_Switch

Beneficiary_Bank

Payee_Participant_Switch

Payee_PSP

Payement request Initiation

1

User verifies the name of receiver

1. Enters the amount
2. Enters the IPS pin and
   initiates the request

2

Payment request initiated
with credentials

3

ReqPay request initiated
type="PAY"

4

Ack sent to Payer
Participant Switch for ReqPay

9

IPS_Switch initiates
ReqPay(DEBIT) to Remitter Bank

10 Ack sent to IPS_Switch for ReqPay(DEBIT)

UPI PIN, Debit to
acc/sov internal system
managed by Bank

11

RespPay(DEBIT) as "SUCCESS"
sent o IPS_Switch

12

Ack sent to Remitter
Bank for RespPay(DEBIT)

20

Payer PSP shows success
on screen to user

19 Payer PSP receives success response

17

RespPay(PAY) as "SUCCESS"
initiated to Payer_Participant_Switch

18 Ack sent to IPS_Switch for RespPay(PAY)

5

ReqAuthDetails request sent
to Payee_Participant_Switch

6 Ack sent to IPS_Switch for ReqAuthDetails

7

RespAuthDetails sent as response
to IPS_Switch this will consist the
account details of receiver

8

Ack sent to Payee
Participant Switch for RespAuthDetails

Now IPS Switch
have both sender
and receiver's
account details

Once UPI_Switch secures
DEBIT leg then it initiates
ReqPay(CREDIT) request

13

IPS_Switch initiates
ReqPay(CREDIT) to Beneficiary Bank

14 Ack sent to IPS_Switch for ReqPay(CREDIT)

15

RespPay(CREDIT) as "SUCCESS"
sent o IPS_Switch

16 Ack sent to Beneficiary_Bank for RespPay(CREDIT)

Once UPI_Switch secures
DEBIT & CREDIT leg then
it initiates RespPay(PAY) request

credit to account/SoV
managed by bank's internal
system

21

ReqTxnConfirmation sent to Payee PSP
it notifies that transaction is completed

22

Ack sent to IPS_Switch
for ReqTxnConfirmation

23

RespTxnConfirmation
initiated to IPS_Switch

24

Ack sent to Payee Participant
Switch for RespTxnConfirmation

PSP_User

Payer_PSP

Payer_Participant_Switch

Remitter_Bank

IPS_Switch

Beneficiary_Bank

Payee_Participant_Switch

Payee_PSP

1. Payer PSP shows CL screen where user enters IPS PIN-Step 1
2. IPS PIN is encrypted with IPS HSM public key & base64 encoded- Step 2
3. IPS PIN once reaches from Payer Switch to IPS Switch it gets base64 decoded, decrypted(IPS HSM private key) -Post Step 8
4. IPS PIN is encrypted with Remitter HSM public key & base64 encoded -Step 9
5. IPS PIN once reaches from IPS Switch to Remitter Switch it gets base64 decoded, decrypted(Remitter HSM private key)-Post Step 10

Sequential Flow Diagram-Pay Request

25

Payee PSP App gets
notification for amount credited

1.  PSP User initiates the payment request by verifying the receiver's name, entering the amount, and
    providing the IPS PIN through the PSP interface.
    Note: Common Library in PSP APP encrypts the IPS PIN using IPS HSM public key and encode with
    base64 encoder.
2.  Payer PSP sends the payment request to the Payer IPS Participant Switch, including the user
    credentials and transaction details.
3.  Payer Participant Switch initiates a `ReqPay` request to the IPS Switch with transaction type "PAY".
4.  IPS Switch sends an acknowledgment to the Payer Participant Switch confirming receipt of the
    `ReqPay` request.
5.  IPS Switch sends a ReqAuthDetails request to the Payee Participant Switch to retrieve the
    receiver’s account details.
6.  Payee Participant Switch acknowledges the ReqAuthDetails request to the IPS Switch.
7.  Payee Participant Switch sends a RespAuthDetails response to the IPS Switch containing the
    receiver’s account information.
8.  IPS Switch sends an acknowledgment to the Payee Participant Switch for the `RespAuthDetails`
    response.
    Note: IPS will decode the IPS PIN using base64 decoder and then decrypt it using IPS HSM private Key

            Technical Specification Document                               54 | P a g e

and again encrypt it using Issuer HSM public Key and encode with base64 encoder. 9. IPS Switch initiates a `ReqPay(DEBIT)` request to the Remitter Bank to debit the payer’s account. 10. Remitter Bank acknowledges the debit request to the IPS Switch.
Note: Remitter banks decode the IPS PIN using base 64 decoder and decrypt the IPS pin using its own
HSM private key and do the validation. 11. Remitter Bank sends a `RespPay(DEBIT)` response with "SUCCESS" status to the IPS Switch after
validating the IPS PIN and debiting the account. 12. IPS Switch sends an acknowledgment to the Remitter Bank for the successful debit response.
Note: Once the debit leg is secured, IPS Switch proceeds to initiate the credit leg of the transaction. 13. IPS Switch initiates a ReqPay(CREDIT) request to the Beneficiary Bank to credit the receiver’s
account. 14. Beneficiary Bank acknowledges the credit request to the IPS Switch. 15. Beneficiary Bank sends a RespPay(CREDIT) response with "SUCCESS" status to the IPS Switch. 16. IPS Switch sends an acknowledgment to the Beneficiary Bank for the successful credit response. 17. IPS Switch sends a RespPay(PAY) response with "SUCCESS" status to the Payer Participant
Switch, indicating that both debit and credit legs are completed.
Note: This response confirms that the transaction is successfully processed end-to-end. 18. Payer Participant Switch acknowledges the RespPay(PAY) response to the IPS Switch. 19. Payer Participant Switch sends the success response to the Payer PSP. 20. Payer PSP displays the success message to the PSP User on the screen.
Transaction Confirmation to Payee: 21. IPS Switch sends a ReqTxnConfirmation request to the Payee Participant Switch to notify that the
transaction is completed. 22. Payee Participant Switch acknowledges the transaction confirmation request to the IPS Switch. 23. Payee Participant Switch sends a RespTxnConfirmation response to the IPS Switch. 24. IPS Switch sends an acknowledgment to Payee Participant Switch for the transaction
confirmation response. 25. Payee Participant Switch sends a notification to the Payee PSP indicating that the amount has
been credited to the receiver’s account.

3.10. Failure Scenarios
This section explains how various failure scenarios are handled during the PAY transaction. The
transaction flow mentioned above will be considered while describing the failure scenarios.

IPS Payer participant unable to notify the Payer:

3.10.1.
In this scenario, when the IPS participants is not able to notify the end customer of the status of the
transaction, a mechanism must be put in place by the Payer IPS participant to notify the customer at a
later stage. This can be achieved by Payer IPS participant reinitiating the notification message to
customer or by providing the customer with an option to check the status of the transaction through
his application, or by providing a list of all transactions (with status) in the application.

Response from IPS does not reach IPS Payee/Payer Participant:

3.10.2.
In this scenario, when the response sent by IPS does not reach IPS Payer/Payee Participant, the IPS
Payer/Payee Participant must have a mechanism to initiate a Check Status API to know the status of
the transaction. The IPS Payer/Payee Participant can only initiate the Check Status API to IPS after the

        Technical Specification Document                               55 | P a g e

time of Transaction expiry time.

Response from Payee bank does not reach IPS:

3.10.3.
In this scenario, when the response sent by Payee Participant does not reach IPS, this transaction will
be considered as deemed. Based on the response of check transaction, credit reversal or settlement
will be applicable. The updated response will be sent to Payer IPS participant.

Declined Response from Payee bank to IPS:

3.10.4.
In this scenario, when the Payee bank responds with a declined response to IPS, IPS will send the
reversal request to Payer bank and respond to Payee and SoV Provider with declined response.

Payee bank is not available to IPS:

3.10.5.
In this scenario, when the Payee Participant is not available to IPS, IPS will send the reversal request to
Payer participant and respond to Payee and Payer participant with declined response.

Declined Response from Payer bank to IPS:

3.10.6.
In this scenario, when the Payer bank responds with a declined response to IPS, IPS will respond to
Payee and Payer participant with declined response. No credit request will be initiated to Payee
participant.

Response from Payer bank does not reach IPS:

3.10.7.
In this scenario, when the response sent by a Payer participant does not reach IPS, IPS will time out the
transaction. IPS will respond to Payee/Payer participant with timeout response.

Payer bank is not available to IPS:

3.10.8.
In this scenario, when the Payer participant is not available to IPS, IPS will respond to Payee and Payer
participant with declined response.

Declined Response from IPS Payee Participant to IPS:

3.10.9.
In this scenario, when the Payee participant responds with a declined response to IPS, IPS will respond
to Payer participant with declined response.

Response from IPS Payee Participant does not reach IPS:

3.10.10.
In this scenario, when the response sent by Payee Participant does not reach IPS, IPS will wait for the
response till the timeout period. Payee participants may have a mechanism to re-send the response
within the timeout period. If IPS does not receive a response within the timeout period, IPS will time out
the transaction and respond to IPS Payer participant with a timeout response.

IPS Payee Participant is not available to IPS:

3.10.11.
In this scenario, when the IPS Payee Participant is not available to IPS, IPS will respond to Payer
participant with declined response.

IPS is not available to Payer IPS Participants:

3.10.12.
In this scenario, when IPS is not available to Payer Participant, Payer Participant will have a mechanism
to re-initiate the Pay request to IPS.
For a failed/declined preapproved transaction remitter participant should reverse the debit on

        Technical Specification Document                               56 | P a g e

receiving the declined response from the IPS.

4.  Detail API Specifications

4.1. API Protocol
All APIs are exposed as stateless service over HTTPS. IPS Participant should ensure idempotent
behavior for all APIs. Usage of open data format in XML and widely used protocol such as HTTP allows
easy adoption by the members. IPS expect a response from the participants. In case of any issue in
response, IPS send NACK to participants.

IPS will configure the endpoint URL for each participant while on-boarding on IPS. All the requests and
responses will be posted to this URL. IPS must send request/response to only one endpoint which is
configured while on boarding the entity. IPS participants must manage the necessary routing and load
balancing at their end to send the specific requests internally to their systems.

HTTPS POST method is used while making the API calls.

API input data should be sent to the following URL as XML document using Content-Type
“application/xml” or “text/xml”.

https://<host>/upi/<api>/<ver>/urn:txnid:<txnId>
`
• host– API server address (Actual production server address will be provided to members at the time

of rollout and all API clients should ensure that actual URL is configurable).

• upi– static value denoting the root of all API URL paths under the IPS.
• api– name of the API URL endpoint.
• ver– version of the API. Multiple versions of the same API may be available for supporting gradual

migration. As of this specification, default version is "2.0".
txnId– Transaction id which will be used for load balancing purpose at IPS end.

•

All APIs have same ack response as given below:
<upi:Ack xmlns:upi="" api="" reqMsgId="" errCode="" ts=""/>
• Ack – root element name of the acknowledgement message.
• api– name of the API for which acknowledgement is given out.
•

`

reqMsgId - message ID of the input for which the acknowledgement is given out. err - this denotes
any error in receiving the original request message.
ts - the timestamp of the acknowledgement sent by the receiver.

•
• Sample for successful ACK is below:

<?xml version="1.0" encoding="UTF-8" standalone="yes"?><ns2:Ack

xmlns:ns2="http://npci.org/upi/schema/"
xmlns:ns3="http://npci.org/cm/schema/" api="ReqHbt"
reqMsgId="SSFDF53CA09B6434C649A3BCDAD0D339D4C" ts="2024-12-
05T08:00:41+05:30"/>

`

        Technical Specification Document                               57 | P a g e

• Negative acknowledgement (NACK) is provided by IPS. IPS provided the HTTP response code 200 in
case of the NACK to IPS participants. Below is the sample for NACK from IPS-to-IPS Participants:

<Ack api="ReqChkTxn"
reqMsgId="TRPa392f2f3c96047e9a61d0f6b9f94a39f"
err="VALIDATION_ERR" ts="2025-05-05T13:30:02+05:30">
<errorMessages>
<errorCd>X09</errorCd>

`

     <errorDtl>TXN.ORGTXNDATE  SHOULD BE WITHIN 90

DAYS</errorDtl>
</errorMessages>

`

</Ack>

Note:

- M/O/C in the API Data Specification Table signifies Mandatory/ Optional/ Conditional field.
- API specifications provided in the respective API Data Specification Table below take
  precedence over the sample messages captured for the same API. The sample messages
  provided are for reference and illustration purposes only. For any clarification you may contact
  Subject Matter Expert (SME).
  If parent field is classified as “Optional” and is populated with the appropriate value, then the
  underlying child fields with “Mandatory” tag must be populated with correct value by the IPS
  participants.
  If field is not required to be part of the request as per the specification, then the same can be
  omitted from the request.

-

-

- Typically for all non-financial API’s the timeout is 10 seconds. Similarly for financial API’s the

time out is 30 seconds. The end-to-end transaction timeout is 90 seconds.

- Head.msgId in request and Resp.reqMsgId in response,reqMsgId in Ack will be the same.

Below is the list of non-financial APIs (META-API’s) defined in the IPS system.

Sr. No Non-Financial Names

API Description

1

2

Heartbeat

List PSP

3

List Account Providers

4

List Keys

This API monitors the IPS system, checks the connection with IPS
participants.
The IPS Operator maintains a list of all registered IPS participants
and their details. This API allows IPS participants to request the
list of all registered IPS participants for local caching. The data is
used to validate the payment alias before initiating any instant
payment transaction.
This API allows IPS participants to get a list of all store of value
provides providers who are connected by using the IPS. IPS
participants maintain the list for registered store of value
providers before registering a customer store of value within their
application.
The IPS Operator maintains a list of all public keys for encryption
purposes. This API allows IPS participants to request and cache

        Technical Specification Document                               58 | P a g e

the list of public keys of the IPS Operator. The IPS Operator
provides the trusted and certified libraries that IPS participant
use for credential capture and PKI public key encryption at the
time of capture.

List Account

Set Credentials

Manage Verified
Address Entities
Validate Address

Mobile Banking
Registration
Check Transaction
Status

List Verified Addresses This API allows IPS participants to request a list of verified alias
entries to protect customers from attempts to spoof. Alias of
well-known merchants, such as e-commerce players, MNOs and
bill payment entities are provided in response list.
This API allows IPS participants to find a list of accounts that are
linked to the mobile by a particular store of value provider.
This API allows IPS participants to manage and access the
common collection of verified alias entries.
This API is used by IPS participant to fetch beneficiary name & full
form alias.
This API is required to provide a unified channel for setting and
changing the IPS PIN across various store of value providers. This
feature is critical as customers can easily change the IPS PIN by
using the mobile.
This API allows the customer to set a new IPS PIN for the first
time.
This API allows the IPS participants to request for the status of the
transaction. The IPS participants must request status only after
the specified timeout period.
This API allows IPS participants to request an OTP for a specific
customer from a remitter.
This API allows IPS participants to enquire the account balance
of a user.
This API will be used to inform the status of the transaction to IPS
participants.
This API shall be used for checking the availability of an ID before
creating a new record as well as for fetching status in case of
timeout of CREATE/MODIFY/DELETE record.
This API will facilitate IPS Mobile Applications to Register/Modify
user IDs at the alias directory. Using this API user can create the
user ID more than once and can be linked to an active full form
alias.
Alias Directory will send the notification of Porting of Mobile
Number to old IPS participants.

Alias
Directory Confirmation

Transaction
Confirmation
Get Address

Register Alias
Directory

Balance Enquiry

OTP Request

5

6

7

8

9

10

11

12

13

14

15

16

17

        Technical Specification Document                               59 | P a g e

Below is the list of Financial APIs defined in the IPS system.

Sr. No Financial API Names

API Description

1

Request Pay Details

2

Request Authentication
Details

This is the primary API that is used by the IPS participants to
initiate the payment request to the IPS Switch.
This API is used for sending back the response of financial
transactions that are initiated through the ReqPay API to the IPS
participants. For example, Direct Pay or Collect Pay transaction.
This API is used to authorize payment and translate IPS
participants’ specific payment aliases to any of the common
global addresses of the customer, such as account numbers
that IPS can understand. Following is the request format of the
Request Authentication Details API.

        Technical Specification Document                               60 | P a g e

4.2. Heartbeat API

The IPS platform uses Heartbeat API to check the connectivity and monitor system uptime of the onboarded entities.
This API can be initiated by both the parties i.e., IPS and IPS payment participants.

The steps to perform HeartBeat API are as follows:

1.  Partner initiates ReqHbt API to IPS.
2.  IPS sends a subsequent Ack to the ReqHbt API from partner.
3.  IPS sends a RespHbt to partner.
4.  Partner sends back an Ack to the RespHbt API from IPS.

Refere Reference Logs HeartBeat

4.2.1. ReqHbt

Sr. No Message Item

<XMLTag>

Occurrence Datatype

Length

M/O/C Rules

1.1
1.1.1

2.1
2.1.1

2.1.2

2.1.3

API Name
API Schema namespace

<ReqHbt>
xmlns

Header
This field indicates the Version of the API ver

<Head>

This field indicates the Request time set
by the creator of the message

ts

field

This
Organization that created the message

indicates

ID of

the

the

orgId

1..1
1..1

1..1
1..1

1..1

1..1

Alphabetic
Fixed
Alphanumeric Min:1

Alphabetic
Numeric

Max:255
Fixed
Min:1
Max:6

ISODateTime Min: 1

Numeric

Max: 255

Min: 1
Max: 20

M
M

M
M

M

M

019_Head_Version

020_Head_ts

055_OrgId

        Technical Specification Document                               61 | P a g e

2.1.4

field

indicates

the Message
This
identifier- used to correlate between
request and response

msgId

1..1

Alphanumeric 35

M

021_Head_MsgId

2.1.5

This field denotes the Product Type

prodType

1..1

Alphanumeric Fixed

M

Value to be passed:
“UPI”

3.1

3.1.1

field

This
information, carried
throughout
system which is visible to all parties

indicates the Transaction
the

<Txn>

1..1

Alphabetic

Fixed

M

This field indicates the Unique Identifier
of the transaction across all entities,
created by the originator

id

1..1

Alphanumeric 35

M

022_Txn_UUID

3.1.2

This field indicates Remarks/ note

note

3.1.3

reference Id

refId

3.1.4

This field indicates the URL for the
transaction

refurl

3.1.5

Type of the Transaction

3.1.6

Request generation timestamp

type

ts

1..1

1..1

1..1

1..1

0..1

Alphanumeric Min: 1

Max: 50

Alphanumeric Min: 1

Max: 35

Alphanumeric Min: 1

Code

Max: 35

Min: 1
Max: 20

ISODateTime Min: 1

Max: 255

4.1

Heartbeat Message Tag

<HbtMsg>

1..1

Alphanumeric Fixed

4.1.1

Heartbeat Message Type

type

1..1

Alphanumeric Fixed

M

M

M

M

M

M

M

057_note

058_refUrl

Hbt

020_Head_ts

Always pass “ALIVE” In
this field.

        Technical Specification Document                               62 | P a g e

4.1.2

field
This
evaluation

indicates Value of

risk

value

1..1

Code

Fixed

M

Please pass: NA

Sample API message is given below –

<upi:ReqHbt xmlns:upi="http://npci.org/upi/schema/">

<Head ver="2.0" ts="" orgId="" msgId="" prodType="UPI" />
<Txn id="" note="" refId="" refUrl="" ts="" type="Hbt" />
<HbtMsg type="ALIVE" value="NA"/>

</upi:ReqHbt>

4.2.2. RespHbt

Sr No Message Item

<XML TAG>

Occurrence DataType

Length

M/O/C Rules

API Name

1.1
1.1.1 API Schema namespace

2.1
Header
2.1.1 Version of the API

<RespHbt >
 xmlns

<Head>
 ver

2.1.2

Time of request from the creator of the
message

ts

2.1.3 Organization id that created the message

orgId

2.1.4 Message

identifier- used

to correlate

msgId

between request and response
This field denotes the Product Type

2.1.5

2.1.6

This denoted Organization Id of the partner.

prodType

destinationOrgI
d

1..1
1..1

1..1
1..1

1..1

1..1

1..1

1..1

1..1

Alphanumeric Min: 1

Alphabetic
Numeric

Max: 255
Fixed
Min: 1
Max: 6
ISODateTime Min: 1

Numeric

Max: 255
Min: 1
Max: 20
Alphanumeric Length:

35

Alphanumeric Fixed

Numeric

Min: 1
Max: 20

M
M

M
M

M

M

M

M

O

        Technical Specification Document                               63 | P a g e

019_Head_Version

020_Head_ts

055_OrgId

021_Head_MsgId

Value to be passed:
“UPI”

3.1

Transaction information, Carried throughout
the system, visible to all parties

<Txn>

3.1.1 Unique Identifier of the transaction across all

id

entities, created by the originator

3.1.2 Description of the transaction (which will be

note

printed on Passbook)

3.1.3 Consumer reference number to identify (like

refId

Loan number, etc.)

3.1.4 URL for the transaction

refurl

Transaction origination time by the creator of
the message
Type of the Transaction

ts

type

3.1.5

3.1.6

4.1

4.1.1

Response
Request Message
Identifier

4.1.2 Result of the transaction

4.1.3

Error code if failed

Sample API message is given below –

<Resp>
reqMsgId

result

errCode

1..1

1..1

1..1

1..1

1..1

1..1

1..1

1..1
1..1

1..1

1..1

Alphabetic

Fixed

Alphanumeric Length:

35

Alphanumeric Min: 1

Max: 50

Alphanumeric Min: 1

Max: 35

Alphanumeric Min: 1

Max: 35

ISODateTime Min: 1

Max: 255
Min:1
Max: 20
Fixed

Code

Alphabetic
Alphanumeric Length

Code

= 35
Min:1
Max:20

Alphanumeric Min:1

Max:20

M

M

M

M

M

M

M

M
M

M

C

022_Txn_UUID

057_note

058_refUrl

020_Head_ts

Value to be passed:
“Hbt”

SUCCESS|FAILURE

027_Response_ErrCo
de

<upi:RespHbt xmlns:upi="http://npci.org/upi/schema/">

<Head ver="2.0" ts="" orgId="" msgId="" prodType="UPI" destinationOrgId=""/>
<Txn id="" note="" refId="" refUrl="" ts="" type="Hbt" />
<Resp reqMsgId="" result="SUCCESS|FAILURE" errCode=""/>

</upi:RespHbt>

        Technical Specification Document                               64 | P a g e

4.3. Non-Financial APIs

4.3.1. List PSP API
IPS will maintain the list of all registered IPS participants and their details. This API allows the IPS participants to request the list of all registered IPS
participants for local caching. This data should be used for validating an alias before initiating the transaction. PSP needs to call this API once a day.

Refer Reference Logs List PSP

4.3.1.1. ReqListPsp
Complete (not all elements/attributes are required for all transactions) XML input message structure for ReqListPsp API is given below.

Sr No Message Item

<XML TAG>

Occurrence

DataType

Length

M/O/C Rules

API Name

1.1
1.1.1 API Schema namespace

2.1
Header
2.1.1 Version of the API

<ReqListPsp >
xmlns

<Head>
 ver

2.1.2

Time of request from the creator of the
message

ts

2.1.3 Organization

id

that created

the

orgId

message

2.1.4 Message identifier- used to correlate
between request and response
This field denotes the Product Type

2.1.5

msgId

prodType

3.1

information,

Transaction
Carried
throughout the system, visible to all
parties
3.1.1 Unique

Identifier of the transaction
across all entities, created by the

<Txn>

id

1..1
1..1

1..1
1..1

1..1

1..1

1..1

1..1

1..1

1..1

Alphanumeric Min: 1

Alphabetic
Numeric

Max: 255
Fixed
Min: 1
Max: 6
ISODateTime Min: 1

Numeric

Max: 255
Min: 1
Max: 20
Alphanumeric Length:

35

Alphanumeric Fixed

Alphabetic

Fixed

M
M

M
M

M

M

M

M

M

019_Head_Version

020_Head_ts

055_OrgId

021_Head_MsgId

Value to be passed:
“UPI”

Alphanumeric Length:

M

022_Txn_UUID

35

        Technical Specification Document                               65 | P a g e

originator

3.1.2 Description of the transaction (which will

note

be printed on Passbook)

3.1.3 Consumer reference number to identify

refId

(like Loan number, etc.)
3.1.4 URL for the transaction

refurl

3.1.5

3.1.6

Transaction origination time by the
creator of the message
Type of the Transaction

ts

type

Sample API message is given below –

1..1

1..1

1..1

1..1

1..1

Alphanumeric Min: 1

Max: 50

Alphanumeric Min: 1

Max: 35

Alphanumeric Min: 1

Max: 99

ISODateTime Min: 1

Code

Max: 255
Min: 1
Max: 20

M

M

M

M

M

057_note

058_refUrl

020_Head_ts

ListPsp

<upi:ReqListPsp xmlns:upi="http://npci.org/upi/schema/">

<Head ver="2.0" ts="" orgId="" msgId="" prodType="UPI" />
<Txn id="" note="" refId="" refUrl="" ts="" type="ListPsp" />
</upi:ReqListPsp>

4.3.1.2. RespListPsp

Sr No
1.1
1.1.1

Message Item
API Name
API Schema namespace

<XML TAG>
<RespListPsp >
xmlns

Occurrence
1..1
1..1

Data Type

Length M/O/C Rules
Fixed
Alphanumeric Min: 1

M
M

Header
Version of the API

2.1
2.1.1

2.1.2

2.1.3

Time of request from the creator of the
message
Organization

that created

id

the orgId

<Head>
ver

ts

1..1
1..1

1..1

1..1

Alphabetic
Numeric

ISODateTime

Numeric

Max: 255
Fixed
Min: 1
Max: 6
Min: 1
Max: 255
Min: 1

M
M

M

M

019_Head_Version

020_Head_ts

055_OrgId

        Technical Specification Document                               66 | P a g e

message
Message identifier- used to correlate
between request and response
This field denotes the Product Type

information,

Transaction
Carried
throughout the system, visible to all
parties
Unique Identifier of the transaction
across all entities, created by the
originator
Description of the transaction (which
will be printed on Passbook)
Consumer reference number to identify
(like Loan number, etc.)
URL for the transaction

msgId

prodType

<Txn>

id

note

refId

refUrl

Transaction origination time by the
creator of the message
Type of the Transaction

ts

type

2.1.4

2.1.5

3.1

3.1.1

3.1.2

3.1.3

3.1.4

3.1.5

3.1.6

4.1
4.1.1

4.1.2

Response
Request Message
Identifier
Result of the transaction

4.1.3

Error code if failed

<Resp>
reqMsgId

result

errCode

5.1
5.1.1

PSP List
Details
participants

related

to

registered

IPS

<PspList>
< PspList.Psp>

5.1.1.1. Name of the IPS participants

name

1..1

1..1

1..1

1..1

1..1

1..1

1..1

1..1

1..1

1..1
1..1

1..1

1..1

1..1
1..n

1..1

Alphanumeric

Alphanumeric

Max: 20
Length:
35
Fixed

Alphabetic

Fixed

Alphanumeric

Length:
35

Alphanumeric Min: 1

Max: 50

Alphanumeric Min: 1

Max: 35

Alphanumeric Min: 1

ISODateTime

Code

Alphabetic
Alphanumeric

Code

Max: 35
Min: 1
Max: 255
Min: 1
Max: 20
Fixed
Length=
35
Min:1
Max:20

Alphanumeric Min:1

Alphabetic
Alphabetic

Max:20
Fixed
Fixed

Alphabetic

Fixed

M

M

M

M

M

M

M

M

M

M
M

M

C

M
M

M

021_Head_MsgId

Value to be passed:
“UPI”

022_Txn_UUID

057_note

058_refUrl

020_Head_ts

ListPsp

SUCCESS|FAILURE

027_Response_Err
Code

        Technical Specification Document                               67 | P a g e

5.1.1.2

Codes defined for the IPS participants codes

5.1.1.3

5.1.1.4

5.1.1.5
5.1.1.6
5.1.1.7
5.1.1.8

5.2

Status of the IPS participants if it is
active or not
URL link provided by IPS participants

active

url

Name of the SPOC
E-mail of the SPOC
Phone Number of the SPOC
Last Modified date of
participants
system
Version supports

information

the
in the

1..n

1..1

0..n

0..n
0..n
0..n
1..1

1..1

1..n

1..1
1..1
1..1

Alphanumeric

Boolean

Fixed

Alphanumeric

Alphanumeric
Alphanumeric
Numeric
ISODateTime

Min: 1
Max: 255

Alphabetic

Fixed

Alphabetic

Fixed

Alphanumeric
Alphanumeric
Boolean

M

M

O

O
O
O
M

M

M

M
M
M

Handle of IPS
Participant (after):
e.g., bon/fnb/wndb
Y/N

URL used during
onboarding

020_Head_ts

true/false

spocName
spocEmail
spocPhone
lastModifiedTs

IPS
IPS

<PspList.Psp.Ver
sionSupported>
<PspList.Psp.Ver
sionSupported
.Version>
no
description
mandatory

5.2.1

Details of versioning

5.2.1.1
5.2.1.2
5.2.1.3

Version Number
Version descriptions
Description of mandatory flag

Sample API message is given below –

<upi:RespListPsp xmlns:upi="http://npci.org/upi/schema/">

<Head ver="2.0" ts="" orgId="" msgId="" prodType="UPI"/>

<Txn id="" note="" refId="" refUrl="" ts="" type="ListPsp"/>
<Resp reqMsgId="" result="SUCCESS|FAILURE" errCode=""/>

<PspList>
<Psp name="" codes="" active="Y|N" url="" spocName="" spocEmail="" spocPhone="" lastModifedTs="">

<VersionSupported>

        Technical Specification Document                               68 | P a g e

<Version no="2.0" description="UPI 2.0: ALL TAG LEVEL CHANGES" mandatory="TRUE"/>

</VersionSupported>
</Psp>

<Psp name="" codes="" active="Y|N" url="" spocName="" spocEmail="" spocPhone="" lastModifedTs="">

<Version no="2.0" description="UPI 2.0: ALL TAG LEVEL CHANGES" mandatory="TRUE"/>

<VersionSupported>

</VersionSupported>

     </Psp>

</PspList>
</upi:RespListPsp>

4.3.2. List Account Providers API
IPS will maintain the list of all account providers who are connected via IPS. IPS participants should maintain the list and check for registered account
providers before registering a customer account within their application.
List Account Provider API will provide the issuer capability to verify ATM PIN for all the registered IPS participants with IPS. IPS participants needs to call
this API once a day.

Refer Reference Logs List Account Providers

4.3.2.1. ReqListAccPvd

Sr No Message Item

<XML TAG>

Occurrence DataType

Length M/O/C Rules

API Name

1.1
1.1.1 API Schema namespace

<ReqListAccPvd >
xmlns

Header
2.1
2.1.1 Version of the API

<Head>
ver

2.1.2

Time of request from the creator of

ts

1..1
1..1

1..1
1..1

1..1

Alphanumeric Min: 1

Alphabetic
Numeric

Max: 255
Fixed
Min: 1
Max: 6
ISODateTime Min: 1

M
M

M
M

M

019_Head_Version

020_Head_ts

        Technical Specification Document                               69 | P a g e

the message
2.1.3 Organization

message

id that created the

orgId

2.1.4 Message identifier- used to correlate

msgId

2.1.5

3.1

between request and response
This field denotes the Product Type

information, Carried
Transaction
throughout the system, visible to all
parties

prodType

<Txn>

3.1.1 Unique Identifier of the transaction
across all entities, created by the
originator
3.1.2 Description of

transaction
(which will be printed on Passbook)
to

reference number
identify (like Loan number, etc.)

3.1.3 Consumer

the

3.1.4 URL for the transaction

id

note

refId

refUrl

3.1.5

3.1.6

Transaction origination time by the
creator of the message
Type of the Transaction

ts

type

Sample API message is given below –

1..1

1..1

1..1

1..1

1..1

1..1

1..1

1..1

1..1

1..1

Numeric

Max: 255
Min: 1
Max: 20
Alphanumeric Length:

Alphanumeric

35
Fixed

Alphabetic

Fixed

M

M

M

M

055_OrgId

021_Head_MsgId

Value to be passed:
“UPI”

Alphanumeric Length:

M

022_Txn_UUID

35

Alphanumeric Min: 1

Max: 50

Alphanumeric Min: 1

Max: 35

Alphanumeric Min: 1

Max: 99

ISODateTime Min: 1

Code

Max: 255
Min:1
Max: 20

M

M

M

M

M

057_note

058_refUrl

020_Head_ts

ListAccPvd

<upi:ReqListAccPvd xmlns:upi="http://npci.org/upi/schema/">

<Head ver="2.0" ts="" orgId="" msgId="" prodType=”UPI”/>
<Txn id="" note="" refId="" refUrl="" ts="" type="ListAccPvd" />

`

</upi:ReqListAccPvd>

        Technical Specification Document                               70 | P a g e

4.3.2.2. RespListAccPvd

Sr No Message Item

<XML TAG>

Occurrence Data Type

Length M/O/C Rules

1.1
1.1.1

2.1
2.1.1

2.1.2

2.1.3

2.1.4

2.1.5

3.1

3.1.1

3.1.2

3.1.3

3.1.4

API Name
API Schema namespace

<RespListAccPvd >
xmlns

Header
Version of the API

<Head>
ver

ts

Time of request from the creator of
the message
Organization id that created the
message
Message identifier- used to
correlate between request and
response
This field denotes the Product Type prodType

msgId

orgId

Transaction information, Carried
throughout the system, visible to
all parties
Unique Identifier of the transaction
across all entities, created by the
originator
Description of the transaction
(which will be printed on
Passbook)
Consumer reference number to
identify (like Loan number, etc.)
URL for the transaction

<Txn>

id

note

refId

refUrl

1..1
1..1

1..1
1..1

1..1

1..1

1..1

1..1

1..1

Alphanumeric Min: 1

Alphabetic
Numeric

Max: 255
Fixed
Min: 1
Max: 6
ISODateTime Min: 1

Numeric

Max: 255
Min: 1
Max: 20
Alphanumeric Length:

35

Alphanumeric Fixed

Alphabetic

Fixed

M
M

M
M

M

M

M

M

M

019_Head_Version

020_Head_ts

055_OrgId

021_Head_MsgId

Value to be passed:
“UPI”

1..1

Alphanumeric Length:

M

022_Txn_UUID

35

1..1

Alphanumeric Min: 1

M

057_note

Max: 50

1..1

1..1

Alphanumeric Min: 1

Max: 35

Alphanumeric Min: 1

Max: 35

M

M

058_refUrl

        Technical Specification Document                               71 | P a g e

3.1.5

3.1.6

4.1
4.1.1

4.1.2

Transaction origination time by the
creator of the message
Type of the Transaction

ts

type

Response
Request Message
Identifier/
Result of the transaction

4.1.3

Error code if failed

<Resp>
reqMsgId

result

errCode

1..1

1..1

1..1
1..1

1..1

1..1

5.1
5.2

5.2.1

Account providers List
Details of registered Account
providers List
Name of the Account Provider

5.2.2

IIN of Account provider

<AccPvdList>
1..1
<AccPvdList.AccPvd>  1..n

name

iin

1..1

1..n

ISODateTime Min: 1

Code

Max: 255
Min:1
Max: 20
Fixed

Alphabetic
Alphanumeric Length=

Code

35
Min:1
Max:20

Alphanumeric Min:1

Max:20
Fixed
Fixed

Min:1
Max:255

Alphabetic
Alphabetic

Alphabetic

Numeric

M

M

M
M

M

C

M
M

M

M

5.2.3

IFSC

ifsc

1..n

Alphanumeric Length:1

M

1

5.2.4

5.2.5

5.2.6
5.2.7

Status of the account provider if it
is active or not
URL link provided by account
provider
Name of the SPOC
E-mail of the SPOC

active

url

spocName
spocEmail

1..1

0..n

0..n
0..n

Boolean

Length:1 M

Alphanumeric

Alphanumeric
Alphanumeric

O

O
O

        Technical Specification Document                               72 | P a g e

020_Head_ts

ListAccPvd

SUCCESS|FAILURE

027_Response_ErrCo
de

IIN is Issuer
Identification
Number / Bank’s
Identification
number provided by
Bank
The IFSC code of the
respective
bank
should be 11-digits.
ex: BWLINA04837
Y/N

5.2.8
5.2.9

5.2.10

Phone Number of the SPOC
List of IPS products for which
account provider is live
Last Modified date of the
account provider information in
the IPS system

5.2.11 Register format of the account
provider information in the IPS
system

spocPhone
prods

lastModifiedTs

0..n
0..n

1..1

Numeric
Alphanumeric

ISODateTime Min: 1

Max: 255

O
O

M

mobRegFormat

1..1

Alphanumeric Fixed

M

020_Head_ts

Value to be passed:
“FORMAT1” if SoV
provider supporting
registration through
the Debit Card (Card
Number and Expiry
Date) for USSD
channel only.

“FORMAT2” if SoV
provider supporting
registration through
the Debit Card (Card
Number and Expiry
Date and ATM PIN)
for Mobile APP
channel only.

“FORMAT6” if Sov
provider supporting
the registration
through NationalID
using Mobile APP
only.

        Technical Specification Document                               73 | P a g e

“FORMAT7” if Sov
provider supporting
registration through
the WALLETPIN
(Mobile APP or USSD
channel)

If the SOV provider
supports multiple
formats, the value
will be passed as a
pipe-separated
string, for example:
FORMAT1|FORMAT2|
FORMAT6|FORMAT7.

5.3

Version supports

5.3.1.1 Details of versioning

5.3.1.2 Version Number
5.3.1.3 Version descriptions
5.3.1.4 Description of mandatory flag

Sample API message is given below –

<AccPvdList.AccPvd
.VersionSupported>
<AccPvdList.AccPvd
.VersionSupported
.Version>
no
description
mandatory

1..1

1..n

1..1
1..1
1..1

Alphabetic

Alphabetic

Alphanumeric
Alphanumeric
Boolean

Fixed

M

M

M
M
M

    true/false

<upi:RespListAccPvd xmlns:upi="http://npci.org/upi/schema/">

<Head ver="1.0|2.0" ts="" orgId="" msgId="" prodType=”UPI” />
<Txn id="" note="" refId="" refUrl="" ts="" type="ListAccPvd" />
<Resp reqMsgId="" result="SUCCESS|FAILURE" errCode=""/>

        Technical Specification Document                               74 | P a g e

<AccPvdList>

<AccPvd name="" iin="" ifsc="" active="Y/N" url="" spocName="" spocEmail="" spocPhone=""
prods="UPI"   lastModifedTs="" mobRegFormat="FORMAT6" >

<VersionSupported>

<Version no="2.0" description="UPI 2.0: ALL TAG LEVEL CHANGES" mandatory="true"/>

</VersionSupported>

</AccPvd>
<AccPvd name="" iin="" ifsc="" active="Y/N" url="" spocName="" spocEmail="" spocPhone=""
prods="UPI" lastModifedTs="" mobRegFormat="FORMAT1|FORMAT2|FORMAT6|FORMAT7">

<VersionSupported>

<Version no="2.0" description="UPI 2.0: ALL TAG LEVEL CHANGES" mandatory="true"/>

</VersionSupported>

</AccPvd>
</AccPvdList>
</upi:RespListAccPvd>

Note:

1.  <! – If mandatory=”true”, then psp should be live in this root version before going live with next or any child version (2.1, 2.2, …) -->
2.  Below FORMAT will be used for registration:

FORMAT
FORMAT1
FORMAT2
FORMAT6
FORMAT7

Using Wallet Pin
Using Card
Channel
Yes (Last six digit and Expiry)
NO
USSD
Yes (Last six digit and Expiry and ATM PIN) NO
APP
NO
APP
NO
YES
APP/USSD NO

National ID
NO
NO
YES
NO

        Technical Specification Document                               75 | P a g e

4.3.3. List Keys API
IPS maintains the list of all public keys for encryption. This API allows the IPS Participant to request and cache the list of public keys of IPS. Trusted and
certified libraries will be used by IPS Participant for credential capture and PKI public key encryption at capture time. These libraries will be provided by
IPS.

Refer Reference Logs List Keys

4.3.3.1. ReqListKeys

Sr No

Message Item

<XML TAG>

Occurrence

DataType

Length

M/O/C Rules

1.1
1.1.1

2.1
2.1.1

2.1.2

2.1.3

2.1.4

2.1.5

2.1.6
3.1

3./1.1

API Name
API Schema namespace

<ReqListKeys>
xmlns

Header
Version of the API

the

from

request

Time of
creator of the message
Organization id that created
the message
Message
identifier- used to
correlate between request and
response
This field denotes the Product
Type
Pagesize
Transaction
Carried
system, visible to all parties
Identifier
Unique

information,
the

throughout

the

of

<Head>
ver

ts

orgId

msgId

prodType

pageSize
<Txn>

id

1..1
1..1

1..1
1..1

1..1

1..1

1..1

1..1

0..1
1..1

1..1

Alphanumeric Min: 1

Alphabetic
Numeric

Max:255
Fixed
Min: 1
Max: 6
ISODateTime Min: 1

Numeric

Max:255
Min: 1
Max: 20

M
M

M
M

M

M

019_Head_Version

020_Head_ts

055_OrgId

Alphanumeric Length: 35 M

021_Head_MsgId

Alphanumeric Fixed

Numeric
Alphabetic

Length:5
Fixed

M

O
M

Value to be passed:
“UPI”

Alphanumeric Length: 35 M

022_Txn_UUID

        Technical Specification Document                               76 | P a g e

transaction across all entities,
created by the originator
Description of the transaction
(which will be printed on
Passbook)
Consumer reference number
to identify (like Loan number,
etc.)
URL for the transaction

note

refId

refUrl

Transaction origination time by
the creator of the message
Type of the Transaction

ts

type

pspOrgId
Common Library Version

pspOrgId
clVersion

3.1.2

3.1.3

3.1.4

3.1.5

3.1.6

3.1.7
3.1.8

1..1

1..1

1..1

1..1

1..1

0.1
0..1

Alphanumeric Min: 1

Max: 50

Alphanumeric Min: 1

Max: 35

Alphanumeric Min: 1

Max: 99

ISODateTime Min: 1

Code

Numeric
Alphanumeric

Max: 255
Min: 1
Max: 20
XXXX
Fixed
Length
=15

M

M

M

M

M

O
C

        Technical Specification Document                               77 | P a g e

057_note

058_refUrl

020_Head_ts

ListKeys|GetToken|Li
stPSPKeys

Thid field will be
mandatory when
type=”ListKeys” else
optional

The clVersion field
will follow an
alphanumeric format
with validation
structured as:
clVersion-
subVersion-
expiryOfPublicKey
Each component is
separated by a
hyphen (‘-’). A sample
value along with a

4.1

Cred tag

<Creds>

0.1

Alphabetic

Fixed

C

4.1.1
4.1.1.1
4.1.1.2
4.1.2
4.1.2.1
4.1.2.2

Cred details
Cred type
Cred Subtype
Data for Cred
Code for Cred
Key date

<Creds.Cred>
type
subType
<Creds.Cred.data>
code
ki

1.n
1.1
1.1
1.1
1.1
1.1

Alphabetic
Alphabetic
Alphabetic
Alphabetic
Alphabetic
Alphanumeric Length:8

Fixed
Fixed
Fixed
Fixed
Fixed

M
M
M
M
M
M

Sample API message is given below –

detailed explanation
has been included in
the Common Library
document for clarity.

It is Encrypted value
provided by Common
Library.
Entire Creds block
will be used if type=
GetToken else not
required

“Challenge”
initial|reset|rotate

format is yyyymmdd

<upi:ReqListKeys xmlns:upi="http://npci.org/upi/schema/">

<Head ver="2.0" ts="" orgId="" msgId="" prodType=”UPI” pageSize="5000" />
<Txn id="" note="" refId="" refUrl="" ts="" type="ListKeys|GetToken|ListPSPKeys" pspOrgId=""/>
<Creds>

<Cred type="challenge" subType="initial|reset|rotate">

<data code="" ki="">
</data>

</Cred>

</Creds>
</upi:ReqListKeys>

Note :

        Technical Specification Document                               78 | P a g e

1. Type: <! – If type=”ListPspKeys”, the field “pspOrgId” is used to get the public signed intent key of the respective psp involved in signed
intent call. It is an optional field. If pspOrgId is not populated, IPS will provide the IPS participants signed intent keys. Psp should fire
Reqlist keys once in a day->

2.  pageSize : <! — the default page size will be 1000, if psp wants to change they can change the required page value between min=”1000”

<XML TAG>

Occurrence DataType

Length

M/O/C Rules

<RespListKeys > 1..1
1..1
xmlns

Alphanumeric Min: 1

to max=”10000” -- >

4.3.3.2. RespListKeys

Sr No Message Item

API Name

1.1
1.1.1 API Schema namespace

2.1
2.1.1

Header
Version of the API

2.1.2

Time of request from the creator of the
message

2.1.3 Organization id that created the message

orgId

2.1.4 Message identifier- used to correlate

msgId

between request and response
This field denotes the Product Type

2.1.5

prodType

<Head>
ver

ts

1..1
1..1

1..1

1..1

1..1

1..1

Alphabetic
Numeric

ISODateTime

Numeric

Alphanumeric

Alphanumeric

2.1.6

Page record start count

pageRecStart

0..1

Numeric

2.1.7

Page record end count

pageRecEnd

0.1

Numeric

2.1.8

Total no.of.pages

pageTotal

0..1

Numeric

        Technical Specification Document                               79 | P a g e

019_Head_Version

020_Head_ts

055_OrgId

021_Head_MsgId

Value to be passed:
“UPI”

M
M

M
M

M

M

M

M

O

O

O

Max: 255
Fixed
Min: 1
Max: 6
Min: 1
Max: 255
Min: 1
Max: 20
Length:
35
Fixed

Min:1
Max:5
Min:1
Max:5
Min:1
Max:5

2.1.9

pageSeqNum

pageSeqNum

0..1

Numeric

3.1

Transaction information, Carried throughout
the system, visible to all parties

<Txn>

3.1.1 Unique Identifier of the transaction across
all entities, created by the originator
3.1.2 Description of the transaction (which will be

id

note

printed on Passbook)

3.1.3 Consumer reference number to identify (like

refId

Loan number, etc.)

3.1.4 URL for the transaction

3.1.5

3.1.6

3.1.7
4.1
4.1.1

4.1.2

Transaction origination time by the creator
of the message
Type of the Transaction

pspOrgId
Response
Request Message
Identifier
Result of the transaction

4.1.3

Error code if failed

refUrl

ts

type

pspOrgId
<Resp>
reqMsgId

result

errCode

5.1
5.2

List of Public Keys of Account providers
Details related to Public Keys

<KeyList>
<KeyList .key>

1..1

1..1

1..1

1..1

1..1

1..1

1..1

0.1
1..1
1..1

1..1

0..1

1..1
1..n

Alphabetic

Alphanumeric

Min:1
Max:5
Fixed

Length:
35

Alphanumeric Min: 1

Max: 50

Alphanumeric Min: 1

Max: 35

Alphanumeric Min: 1

ISODateTime

Code

Alphabetic
Alphanumeric

Code

Max: 35
Min: 1
Max: 255
Min: 1
Max: 20

Fixed
Length=
35
Min: 1
Max: 20

Alphanumeric Min: 1

Max:20

Alphabetic
Alphabetic

O

M

M

M

M

M

M

M

O
M
M

M

C

M
M

022_Txn_UUID

057_note

058_refUrl

020_Head_ts

ListKeys|GetToken|
ListPSPKeys

SUCCESS|FAILURE

027_Response_ErrC
ode

For IPS Keys, It’s
“NPCI” and for PSP
keys it’s OrgId
assigned to the PSP
at the time of
onboarding

        Technical Specification Document                               80 | P a g e

5.2.1

Account provider code

code

1..1

Alphanumeric

5.2.2 Owner of the Key
5.2.3

Type of the Key

5.2.4

Key Index Date

5.2.5

Base64 encoded certificate

Sample API message is given below –

owner
type

ki

<KeyList
.key.keyValue>

1..1
1..1

1..1

1..1

Alphabetic
Alphabetic

Alphanumeric

Alphanumeric

Fixed
Fixed

Length:
8

For IPS Keys, It’s
“NPCI” and for PSP
keys it’s OrgId
assigned to the PSP
at the time of
onboarding
NPCI
PKI,CLF,
SIGNEDINTENT
Format is
yyyymmdd

M

M
M

M

M

<upi:RespListKeys xmlns:upi="http://npci.org/upi/schema/">

<Head ver="2.0" ts="" orgId="" msgId="" prodType=”UPI” pageSeqNum="" pageRecStart="1"
pageRecEnd="" pageTotal="" />
<Txn id="" note="" refId="" refUrl="" ts="" type="ListKeys|GetToken|ListPSPKeys"

pspOrgId="" />

<Resp reqMsgId="" result="SUCCESS|FAILURE" errCode=""/>
<keyList>

<key code="NPCI" type="PKI" owner="" ki="yyyymmdd">
<keyValue>base64 encoded certificate</keyValue>

</key>
<key code="NPCI" type="CLF" owner="" ki="yyyymmdd">

<keyValue>Token|Encrypted/base64 encoded certificate</keyValue>

</key>
<key code="" type=" " owner="" ki="yyyymmdd">

<keyValue>Token|Encrypted/base64 encoded certificate</keyValue>

</key>
<key code="" type=" " owner="" ki="yyyymmdd">

        Technical Specification Document                               81 | P a g e

<keyValue>Token|Encrypted/base64 encoded certificate</keyValue>

</key>
</keyList>
</upi:RespListKeys>

Note:

1.  Page size, pageRecStart, pageRecEnd & pageTotal only applicable for ver 2.0 and above
2.  pageTotal : <! — for e.g. if records are 10,000 & pageTotal=”2” for, then IPS participant receives 2 RespListKeys from IPS -->

4.3.4. List Verified Address Entries API

IPS offers a mechanism to protect customers from attempts to spoof well-known merchants.

Refer Reference Logs List Verified Address Entries

4.3.4.1. ReqListVae

Sr No Message Item

<XML TAG>

Occurrence DataType

Length M/O/C Rules

API Name

1.1
1.1.1 API Schema namespace

Header
2.1
2.1.1 Version of the API

<ReqListVae>
xmlns

<Head>
ver

2.1.2

Time of request from the creator of the
message

ts

2.1.3 Organization

id

that created

the

orgId

message

2.1.4 Message identifier- used to correlate msgId

1..1
1..1

1..1
1..1

1..1

1..1

1..1

Alphanumeric Min: 1

Alphabetic
Numeric

Max: 255
Fixed
Min: 1
Max: 6
ISODateTime Min: 1

Numeric

Max: 255
Min: 1
Max: 20

M
M

M
M

M

M

019_Head_Version

020_Head_ts

055_OrgId

Alphanumeric Length: M

021_Head_MsgId

        Technical Specification Document                               82 | P a g e

between request and response
This field denotes the Product Type

2.1.5

2.1.6 Pagesize

prodType

pageSize

1..1

0..1

Alphanumeric

Numeric

35
Fixed

Length:
5

M

C

Value to be passed:
“UPI”
By default, the UPI
like system provides
the 1000 records, if
PSP wants more
records than PSP
needs to populate
this filed with
mentioned above
value.

3.1

information,

Transaction
Carried
throughout the system, visible to all
parties

<Txn>

1..1

Alphabetic

Fixed

M

3.1.1 Unique Identifier of the transaction
across all entities, created by the
originator

id

3.1.2 Description of the transaction (which

note

will be printed on Passbook)

3.1.3 Consumer reference number to identify

refId

(like Loan number, etc.)
3.1.4 URL for the transaction

refUrl

3.1.5

3.1.6

Transaction origination time by the
creator of the message
Type of the Transaction

ts

type

1..1

Alphanumeric Length:

M

022_Txn_UUID

1..1

1..1

1..1

1..1

1..1

35

Alphanumeric Min: 1

Max: 50

Alphanumeric Min: 1

Max: 35

Alphanumeric Min: 1

Max: 35

ISODateTime Min: 1

Code

Max: 255
Min:1
Max: 20

M

M

M

M

M

057_note

058_refUrl

020_Head_ts

ListVae

        Technical Specification Document                               83 | P a g e

Sample API message is given below –

<upi:ReqListVae xmlns:upi="http://npci.org/upi/schema/">

<Head ver="2.0" ts="" orgId="" msgId="" prodType="UPI" pageSize="1000"/>
<Txn id="" note="" refId="" refUrl="" ts="" type="ListVae"/>

</upi:ReqListVae>

Comments:

1.  pageSize: <! — The default page size will be 1000, if IPS participant wants to change they can change the required page value between

min=”1000” to max=”10000” -- >

4.3.4.2. RespListVae

Sr No Message Item

<XML TAG>

Occurrence DataType

Length

M/O/C Rules

API Name

1.1
1.1.1 API Schema namespace

<RespListVae>
xmlns

Header
2.1
2.1.1 Version of the API

<Head>
ver

2.1.2

Time of request from the creator of the
message

ts

2.1.3 Organization

id

that created

the

orgId

message

2.1.4 Message identifier- used to correlate
between request and response
This field denotes the Product Type

2.1.5

msgId

prodType

2.1.6 Page record start count

pageRecStart

2.1.7 Page record end count

pageRecEnd

1..1
1..1

1..1
1..1

1..1

1..1

1..1

1..1

0..1

0.1

Alphanumeric Min: 1

Alphabetic
Numeric

Max: 255
Fixed
Min: 1
Max: 6
ISODateTime Min: 1

Numeric

Max: 255
Min: 1
Max: 20

M
M

M
M

M

M

019_Head_Version

020_Head_ts

055_OrgId

Alphanumeric Length: 35 M

021_Head_MsgId

Alphanumeric

Fixed

Numeric

Numeric

Min:1
Max:5
Min:1
Max:5

M

O

O

Value to be passed:
“UPI”

        Technical Specification Document                               84 | P a g e

2.1.8

Total no.of.pages

pageTotal

2.1.9

pageSeqNum

pageSeqNum

3.1

Transaction information on, Carried
throughout the system, visible to all
parties

<Txn>

3.1.1 Unique Identifier of the transaction
across all entities, created by the
originator

id

3.1.2 Description of the transaction (which
will be printed on Passbook)

note

3.1.3 Consumer

reference number

to

refId

identify (like Loan number, etc.)

3.1.4 URL for the transaction

refUrl

3.1.5

3.1.6

Transaction origination time by the
creator of the message
Type of the Transaction

ts

type

Response

4.1
4.1.1 Request Message identifier

4.1.2 Result of the transaction

4.1.3

Error code if failed

<Resp>
reqMsgId

result

errCode

5.1
5.2

List of Verified Address Entries
Details Related to list of Verified
Address Entries
5.2.1 Name of the Merchant

<VaeList>
<VaeList.Vae>

name

0..1

0..1

1..1

Numeric

Numeric

Alphabetic

Min:1
Max:5
Min:1
Max:5
Fixed

O

O

M

1..1

Alphanumeric Length: 35 M

022_Txn_UUID

1..1

1..1

1..1

1..1

1..1

1..1
1..1

1..1

0..1

1..1
1..n

1..1

Alphanumeric Min: 1

Max: 50

Alphanumeric Min: 1

Max: 35

Alphanumeric Min: 1

Max: 35

ISODateTime Min: 1

Code

Max: 255
Min:1
Max: 20
Fixed

Alphabetic
Alphanumeric Length=

Code

35
Min:1
Max:20

Alphanumeric Min:1

Max:20
Fixed
Fixed

Alphabetic
Alphabetic

Alphanumeric

M

M

M

M

M

M
M

M

C

M
M

M

057_note

058_refUrl

020_Head_ts

ListVae

SUCCESS|FAILURE

027_Response_ErrC
odes

Name of the
Merchant

        Technical Specification Document                               85 | P a g e

5.2.2

Payment Alias of the Merchant

addr

5.2.3
Logo of the Merchant
5.2.4 URL Link provided by Merchant
5.3

Key Details Related to list of Verified
Address Entries

logo
url
<VaeList.Vae.key>

5.3.1 Code for the Key

code

Type pf Key
5.3.2
5.3.3 Date of key

5.3.4

base64 encoded certificate

type
ki

<VaeList.Vae.key.k
eyValue>

Sample API message is given below –

1..1

1..n
1..n
1..n

1.1

1.1
1.1

1.1

Alphanumeric

Alphanumeric
Alphanumeric
Alphabetic

Fixed

Alphabetic

Fixed

Alphabetic
Alphanumeric Length:8

Fixed

Alphanumeric

M

M
M
M

M

M
M

M

Alias of the
Merchant

it’s OrgId assigned to
the PSP at the time
of onboarding.

PKI format.
The format is:
yyyymmdd

<upi:RespListVae xmlns:upi="http://npci.org/upi/schema/">

<Head ver="2.0" ts="" orgId="" msgId="" prodType="UPI" pageSeqNum=""
pageRecStart="1" pageRecEnd="" pageTotal="" />
<Txn id="" note="" refId="" refUrl="" ts="" type="ListVae" />
<Resp reqMsgId="" result="SUCCESS|FAILURE" errCode=""/>
<VaeList>
    <Vae name="LIC" addr="" logo="image" url="">
     <key code="NPCI" type="PKI" ki="yyyymmdd">

<keyValue>base64 encoded certificate</keyValue>

              </key>
          </Vae>
          <Vae name="IRCTC" addr="" logo="image" url="">
              <key code="NPCI" type="PKI" ki="yyyymmdd">

<keyValue>base64 encoded certificate</keyValue>

              </key>

        Technical Specification Document                               86 | P a g e

</Vae>
</VaeList>
</upi:RespListVae>

Comments :

1.  pageTotal : <! — for e.g. if records are 10,000 & pagesize=”1000”, then IPS participant receives 10 RespListVae from IPS -- >

4.3.5. List Account API

IPS participants to find the list of accounts linked to the mobile by a particular account provider. If the destination bank name is not known
details of account provider will be fetched from alias directory.

As part of ATM PIN introduction, the Payer SoV provider bank has to respond with new cred block with subtype as ATM PIN, its type and length,
where PIN length can be 4 or 6 digits. This info will be used to capture ATM PIN in the common library.

Refer Reference Logs List Account API

4.3.5.1. ReqListAccount

Sr No Message Item

<XML TAG>

Occurrence DataType

Length

M/O/C Rules

1.1

API Name

<ReqListAccount> 1..1

1.1.1

API Schema namespace

xmlns

2.1

Header

<Head>

1..1

1..1

Alphanumeric Min: 1

Max: 255

M

M

Alphabetic

Fixed

M

        Technical Specification Document                               87 | P a g e

2.1.1

Version of the API

2.1.2

Time of request from the
creator of the message

ver

ts

2.1.3

Organization id that created
the message

orgId

2.1.4 Message identifier- used to

msgId

correlate between request and
response

2.1.5

This field denotes the Product
Type

1..1

1..1

1..1

1..1

Numeric

Min: 1
Max: 6

ISODateTime Min: 1

M

M

019_Head_Version

020_Head_ts

Numeric

Max: 255

Min: 1
Max: 20

M

055_OrgId

Alphanumeric Length:

M

021_Head_MsgId

35

prodType

1..1

Alphanumeric Fixed

M

Value to be passed: “UPI”

3.1

3.1.1

3.1.2

Transaction information,
Carried throughout the
system, visible to all parties

<Txn>

1..1

Alphabetic

Fixed

M

Unique Identifier of the
transaction across all entities,
created by the originator

id

1..1

Alphanumeric Length:

M

022_Txn_UUID

35

Description of the transaction
(which will be printed on
Passbook)

note

1..1

Alphanumeric Min: 1

M

057_note

Max: 50

3.1.3

3.1.4

Consumer reference number
to identify (like Loan number,
etc.)
URL for the transaction

refId

1..1

Alphanumeric Min: 1

M

Max: 35

refUrl

1..1

Alphanumeric Min: 1

M

058_refUrl

Max: 35

        Technical Specification Document                               88 | P a g e

3.1.5

Transaction origination time by
the creator of the message

ts

3.1.6

Type of the Transaction

type

4.1
4.1.1

Linked account list
Account linkage to Mobile

4.1.2 Mobile number

<Link>
type

value

5.1
5.1.1

Details related to Payer Alias
Alias Of the Payer

<Payer>
addr

5.1.2

Name of the Payer

name

5.1.3

Unique identifier for each
transaction inside a file
including payer and payee

seqNum

5.1.4

Type of the Payer

type

5.1.5 Merchant Classification Code

code

1..1

1..1

1..1
1..1

1..1

1..1
1..1

1..1

1..1

1..1

1..1

ISODateTime Min: 1

Max: 255

Min: 1
Max: 20

Code

Alphabetic
Alphabetic

numeric

Fixed
Alphabetic
Alphanumeric Min:1

Max: 255

Alphanumeric Min:1

Numeric

Max: 99

Min:1
Max: 3

M

M

M
M

M

M
M

M

M

020_Head_ts

ListAccount

MOBILE

056_seqNum

Code

Fixed

M

029_Payer/Payee_Type

Numeric

Length=4 M

024_Txn_code

– MCC
National ID consent

5.1.6

aadhaarConsent

1..1

Alphabetic

Length=1 M

5.2

Device Tag

5.2.1

Device Tag

<Payer.Device>
<Payer.Device
.Tag>

1..1

1..n

Alphabetic

Fixed

Alphabetic

Fixed

M

M

        Technical Specification Document                               89 | P a g e

Y/N
This is the consent that user
needs to provide if National ID
needs to be fetched in
response.

5.2.1.1 Name of the property

name

1..n

Fixed

M

Code
(MOBILE,
GEOCODE,
LOCATION,
IP, TYPE, ID,
OS, APP,
CAPABILITY)

5.2.1.1 Value of the properties
5.3

Only one Entity is allowed for a
payer
Type of the Alias

5.3.1

value
<Payer.Ac>

addrType

1..n
1..1

1..1

Alphanumeric
Alphabetic

Fixed

Code

c5.4

Details related to Payer Alias

<Payer.Ac.Detail> 1..n

Alphabetic

5.4.1

Name of the property

name

1..n

Code

Min:1
Max:20
Min:1
Max:255
Fixed

M
M

M

M

M

046_ReqPay_Ac_addrType

048_ReqPay_Ac_name_Account

049_ReqPay_Ac_name_Mobile

050_ReqPay_Ac_name_Card

5.4.2

Value of the property

value

1..n

Alphanumeric Min:1

M

Max:20

Sample API message is given below –

<upi:ReqListAccount xmlns:upi="http://npci.org/upi/schema/">

<Head ver="1.0|2.0" ts="" orgId="" msgId="" prodType="UPI"/>
<Txn id="" note="" refId="" refUrl="" ts="" type="ListAccount" />
<Link type="MOBILE" value=""/>
<Payer addr="" name="" seqNum="" type="PERSON|ENTITY" code="" aadhaarConsent="Y|N">

<Device>

        Technical Specification Document                               90 | P a g e

<Tag name="MOBILE" value=""/>
<Tag name="GEOCODE" value=""/>
<Tag name="LOCATION" value="" />
<Tag name="IP" value=""/>
<Tag name="TYPE" value=""/>
<Tag name="ID" value=""/>
<Tag name="OS" value=""/>
<Tag name="APP" value=""/>
<Tag name="CAPABILITY" value=""/>
<Tag name="TELECOM" value=""/>

</Device>
<Ac addrType="ACCOUNT">

<Detail name="IFSC" value=""/>

</Ac>

</Payer>

</upi:ReqListAccount>
4.3.5.2.
Sr no Message Item

RespListAccount

<XML TAG>

Occurrence DataType

Length M/O/

Rules

API Name

1.1
1.1.1 API Schema namespace

<RespListAccount> 1..1
1..1
xmlns

2.1
Header
2.1.1 Version of the API

<Head>
ver

2.1.2

Time of request from the creator of the
message

ts

2.1.3 Organization id that created the message

orgId

2.1.4 Message identifier- used to correlate between

msgId

request and response
This field denotes the Product Type

2.1.5

prodType

1..1
1..1

1..1

1..1

1..1

1..1

Alphanumeric Min: 1

Alphabetic
Numeric

Max: 255
Fixed
Min: 1
Max: 6
ISODateTime Min: 1

Numeric

Max: 255
Min: 1
Max: 20
Alphanumeric Length:

35

Alphanumeric Fixed

C
M
M

M
M

M

M

M

M

019_Head_Version

020_Head_ts

055_OrgId

021_Head_MsgId

Value to be

        Technical Specification Document                               91 | P a g e

3.1

Transaction information, Carried throughout
the system, visible to all parties

<Txn>

3.1.1 Unique Identifier of the transaction across all

id

entities, created by the originator

3.1.2 Description of the transaction (which will be

note

printed on Passbook)

3.1.3 Consumer reference number to identify (like

refId

Loan number, etc.)

3.1.4 URL for the transaction

refUrl

3.1.5

3.1.6

Transaction origination time by the creator of
the message
Type of the Transaction

ts

type

4.1
Response
4.1.1 Request Message
Identifier

4.1.2 Result of the transaction

4.1.3

Error code if failed

5.1
5.2

Account List
Details Related to Account

5.2.1 Masked Account Number

<Resp>
reqMsgId

result

errCode

<AccountList>
<AccountList.Acco
unt>
maskedAccNumber  1..1

1..1
1..n

1..1

1..1

1..1

1..1

1..1

1..1

1..1

1..1
1..1

1..1

0..1

Alphabetic

Fixed

M

passed: “UPI”

Alphanumeric Length:

M

022_Txn_UUID

35

Alphanumeric Min: 1

Max: 50

Alphanumeric Min: 1

Max: 35

Alphanumeric Min: 1

Max: 35

ISODateTime Min: 1

Code

Max: 255
Min:1
Max: 20
Alphabetic
Fixed
Alphanumeric Length

Code

=35
Min: 1
Max: 20

Alphanumeric Min:1

Alphabetic
Alphabetic

Max:20
Fixed
Fixed

Alphanumeric Min: 2

Max: 40

M

M

M

M

M

M
M

M

C

M
M

M

057_note

058_refUrl

020_Head_ts

ListAccount

SUCCESS|FAILUR
E
027_Response_Er
rCode

For wallet , mobile
number needs to
be populated

Random 7-digit

5.2.2

IFSC code of the Account

5.2.3 MMID linked to Mobile

ifsc

mmid

1..1

1..1

Alphanumeric Length:

M

Numeric

11
Length:7 M

        Technical Specification Document                               92 | P a g e

5.2.4 Name of the Account Holder

name

5.2.5 National ID Enabled Bank Account or not
5.2.6 National ID No

aeba
aadhaarNo

1..1

1..1
0..1

Alphabetic

Max: 255 M

Boolean
Numeric

Fixed
M
Fixed:11 C

5.2.7

Account reference number provided by Bank

accRefNumber

1..1

Numeric

Min: 2
Max: 40

5.2.8 Mobile banking enabled bank account or not mbeba

5.2.9

Account Type

accType

1..1

1..1

Boolean

Fixed

Alphabetic

M

M

M

numeric value
required.
Based on the Core
Banking records
Y/N
If user consent for
National ID
(aadhaarConsent)
is “Y” in request
and aeba=”Y” then
bank should send
the National ID
number in
response.

For wallet , mobile
number needs to
be populated
Y/N

Account Type
supported by IPS

        Technical Specification Document                               93 | P a g e

5.3

Details related to credentials supported for an
Account

<AccountList.Acco
unt.CredsAllowed>

1..n

Alphabetic

Fixed

M

5.3.1 Creds type
5.3.2 Creds subtype

type
subtype

5.3.3. Creds Allowed format alphanumeric/numeric

dType

5.3.4 Allowed length of the credential.

dLength

1..1
1..1

1..1

1..1

Alphabetic
Alphabetic

Fixed
Fixed

Alphabetic

Fixed

Numeric

Min
length: 4
or 6

M
M

M

M

The CredsAllowed
tag lists details
related to the
credentials that
are supported for
an account. The
types of Creds that
are allowed are
PIN (MPIN /
ATMPIN) / OTP
(SMS)

PIN/OTP
SMS/MPIN/ATMPI
N/WALLETPIN
It’s always dType =
”Numeric”
This field
represents the
length of the OTP
/PIN.

Sample API message is given below –

<upi:RespListAccount xmlns:upi="http://npci.org/upi/schema/">

<Head ver="2.0" ts="" orgId="" msgId="" prodType="UPI"/>
<Txn id="" note="" refId="" refUrl="" ts="" type="ListAccount"/>
<Resp reqMsgId="" result="SUCCESS|FAILURE" errCode=""/>
<AccountList>

<Account accType="" mbeba="" accRefNumber="" maskedAccnumber="" ifsc="" mmid="" name=""
aeba="Y|N">

<CredsAllowed type="PIN" subType="ATMPIN" dType="" dLength=""/>

        Technical Specification Document                               94 | P a g e

</Account>
<Account accType="" mbeba="" accRefNumber=""  maskedAccnumber="" ifsc="" mmid="" name=""
aeba="Y|N">

<CredsAllowed type="PIN" subType="MPIN" dType="" dLength=""/>
<CredsAllowed type="PIN" subType="ATMPIN" dType="" dLength=""/>
<CredsAllowed type="OTP" subType="SMS" dType="" dLength=""/>

</Account>
</AccountList>

</upi:RespListAccount>

NOTE:

1.  mbeba : Mbeba flag is used to mention the IPS PIN availabilitiy.
2.  aadhaarNo : if user consent for National ID (aadhaarConsent) is “Y” and aeba=”Y” then bank should send the National ID number in

response in aadhaarNo field.

3.  Masked accout.no should be masked with capital letter“X”. accRefNumber field needs to populate with account number.
4.  In Case of Account type other than WALLET like “SAVINGS”, the Issuer bank provides the details below:

<Account accType="SAVINGS" accRefNumber="117795514570123" maskedAccnumber="XXXXXXXXXX570123"
         ifsc="AABY0000382" mmid="3004010" name="ABC" aeba="Y" mbeba="Y" aadhaarNo="56789012346">

<CredsAllowed dLength="6" dType="Numeric" subType="SMS" type="OTP"/>

          <CredsAllowed dLength="6" dType="Numeric" subType="MPIN" type="PIN"/>
          <CredsAllowed dLength="6" dType="Numeric" subType="ATMPIN" type="PIN"/>

</Account>

5.  In Case of Account type WALLET, the Issuer bank provides the wallet details below:

<Account accType="WALLET" mbeba="N" accRefNumber="123456789"  maskedAccnumber="XXXXX6789" ifsc="
AABY0000382" mmid="123456" name="Shyam" aeba="N">

<CredsAllowed type="PIN" subType="MPIN" dType="NUMERIC" dLength="6"/>
<CredsAllowed type="PIN" subType="WALLETPIN" dType="NUMERIC" dLength="6"/>
<CredsAllowed type="OTP" subType="SMS" dType="NUMERIC" dLength="6"/>

     </Account>

        Technical Specification Document                               95 | P a g e

4.3.6. Manage Verified Address Entries API

IPS offers a mechanism to protect customers from attempts to spoof well known merchants such as e-commerce players, telecom players, bill
payment entities, etc. This mechanism is an API, where the IPS participants can manage, and access the common collection of verified address
entries. IPS, with the help of IPS participants, will define a process to manage these entries.IPS Partcipant needs to fire this API once in day.

Refer Reference Logs Manage Verified Address Entries API

4.3.6.1. ReqManageVae

Sr No Message Item

<XML TAG>

Occurrence DataType

Length

M/O/C Rules

API Name

1.1
1.1.1 API Schema namespace

<ReqManageVae >
xmlns

Header
2.1
2.1.1 Version of the API

<Head>
ver

2.1.2

Time of request from the creator of the
message

ts

2.1.3 Organization

id

that created

the

orgId

message

2.1.4 Message identifier- used to correlate
between request and response
This field denotes the Product Type

2.1.5

msgId

prodType

3.1

information,

Transaction
Carried
throughout the system, visible to all
parties

<Txn>

1..1
1..1

1..1
1..1

1..1

1..1

1..1

1..1

1..1

Alphanumeric Min: 1

Alphabetic
Numeric

Max: 255
Fixed
Min: 1
Max: 6
ISODateTime Min: 1

Numeric

Max: 255
Min: 1
Max: 20
Alphanumeric Length:

35

Alphanumeric Fixed

Alphabetic

Fixed

M
M

M
M

M

M

M

M

M

        Technical Specification Document                               96 | P a g e

019_Head_Version

020_Head_ts

055_OrgId

021_Head_MsgId

Value to be passed:
“UPI”

3.1.1 Unique Identifier of the transaction
across all entities, created by the
originator

id

3.1.2 Description of the transaction (which

note

will be printed on Passbook)

3.1.3 Consumer reference number to identify

refId

(like Loan number, etc.)
3.1.4 URL for the transaction

refUrl

3.1.5

3.1.6

Transaction origination time by the
creator of the message
Type of the Transaction

ts

type

4.1
Details vae
4.1.1 Details vae
4.1.2 Option to Update or Remove

<VaeList>
<VaeList.Vae>
op

4.1.3

Sequence Number

seqNum

4.1.4

Payment alias

4.1.5

Logo

addr

logo

1..1

Alphanumeric Length:

M

022_Txn_UUID

1..1

1..1

1..1

1..1

1..1

1..n
1..n
1..1

1..1

1..1

1..1

35

Alphanumeric Min: 1

Max: 50

Alphanumeric Min: 1

Max: 35

Alphanumeric Min: 1

Max: 35

ISODateTime Min: 1

Code

Alphabetic
Alphabetic
Alphabetic

Max: 255
Min:1
Max: 20
Fixed
Fixed
Fixed

Numeric

Min:1
Max:3
Alphanumeric Min: 1
Max:
255

Alphanumeric Min: 1
Max:
255

M

M

M

M

M

M
M
M

M

M

M

057_note

058_refUrl

020_Head_ts

ManageVae

ADD|UPDATE|REMOVE
For UPDATE: All the
fields can be updated
except the “addr”
field.
For REMOVE all fields
will be passed
including Key.
056_seqNum

        Technical Specification Document                               97 | P a g e

4.1.6 URL Link

4.1.7

name

4.2
4.2.1
4.2.2
4.2.3

Details related to Public Keys
Account provider code
Type of the Key
Key Index Date

4.2.4 Base64 encoded certificate

Sample API message is given below –

url

name

<VaeList.Vae.key>
code
type
ki

<VaeList.Vae.key
.keyValue>

1..1

1..1

1..1
1..1
1..1
1..1

1..1

Alphanumeric Min: 1
Max:
255

Alphanumeric Min: 1
Max:
255
Fixed
Fixed

Alphabetic
Alphabetic
Alphabetic
Alphanumeric

Length
:8

Alphabetic

M

M

M
M
M
M

M

NPCI
PKI
Format is: yyyymmdd

<upi:ReqManageVae xmlns:upi="http://npci.org/upi/schema/">

<Head ver="2.0" ts="" orgId="" msgId=““ prodType=“UPI”/>
<Txn id="" note="" refId="" refUrl="" ts="" type="ManageVae"/>
<VaeList>
<Vae op="ADD|UPDATE|REMOVE" seqNum="1" name="" addr="" logo="image" url="">

<key code="NPCI" type="PKI" ki="yyyymmdd">

<keyValue>base64 encoded certificate</keyValue>

</key>

</Vae>

<Vae op="ADD|UPDATE|REMOVE" seqNum="2" name="" addr="" logo=" image" url="">

<key code="NPCI" type="PKI" ki="yyyymmdd">

<keyValue>base64 encoded certificate</keyValue>

</key>

</Vae>
</VaeList>
</upi:ReqManageVae>

        Technical Specification Document                               98 | P a g e

4.3.6.2.

RespManageVae

Sr No Message Item

<XML TAG>

Occurrence DataType

Length

M/O/C Rules

API Name

1.1
1.1.1 API Schema namespace

<RespManageVae > 1..1
1..1
xmlns

Header
2.1
2.1.1 Version of the API

<Head>
ver

2.1.2

Time of request from the creator of the
message

ts

2.1.3 Organization

id

that created

the

orgId

message

2.1.4 Message identifier- used to correlate
between request and response
This field denotes the Product Type

2.1.5

msgId

prodType

3.1

information,

Transaction
Carried
throughout the system, visible to all
parties
3.1.1 Unique

Identifier of the transaction
across all entities, created by the
originator

<Txn>

Alphanumeric Min: 1

Alphabetic
Numeric

Max: 255
Fixed
Min: 1
Max: 6
ISODateTime Min: 1

Numeric

Max: 255
Min: 1
Max: 20

M
M

M
M

M

M

019_Head_Version

020_Head_ts

055_OrgId

Alphanumeric Length: 35 M

021_Head_MsgId

Alphanumeric Fixed

Alphabetic

Fixed

M

M

Value to be passed:
“UPI”

1..1
1..1

1..1

1..1

1..1

1..1

1..1

id

1..1

Alphanumeric Length: 35 M

022_Txn_UUID

3.1.2 Description of the transaction (which will

note

be printed on Passbook)

3.1.3 Consumer reference number to identify

refId

(like Loan number, etc.)
3.1.4 URL for the transaction

refUrl

3.1.5

Transaction origination time by the
creator of the message

ts

1..1

1..1

1..1

1..1

Alphanumeric Min: 1

Max: 50

Alphanumeric Min: 1

Max: 35

Alphanumeric Min: 1

Max: 35

ISODateTime Min: 1

Max: 255

M

M

M

M

057_note

058_refUrl

020_Head_ts

        Technical Specification Document                               99 | P a g e

3.1.6

Type of the Transaction

4.1
4.1.1

Response
Request Message
Identifier

4.1.2 Result of the transaction

4.1.3

Error code if failed

5.1
5.2

Ref type
Option to Update or Remove

5.2.1

Sequence Number

5.2.2

Payment alias

5.2.3 Result of the transaction

type

<Resp>
reqMsgId

result

errCode

<Resp.Ref>
op

seqNum

addr

result

5.2.4 Response code of the transaction

respCode

Sample API message is given below –

1..1

1..1
1..1

1..1

0..1

1..n
1..1

1..1

1..1

1..1

1..1

Code

Alphabetic
Alphanumeric

Code

Min: 1
Max: 20
Fixed
Length=
35
Min:1
Max:20

Alphanumeric Min:1
Max:20
Fixed
Fixed

Code
Alphabetic

Numeric

Min:1
Max:3
Alphanumeric Min: 1

Code

Max:255
Min:1
Max:20
Alphanumeric Min:1

Max: 20

M

M
M

M

C

M
M

M

M

M

M

ManageVae

SUCCESS|FAILURE

027_Response_Err
Code

ADD|UPDATE|REMO
VE
056_seqNum

SUCCESS|FAILURE

<upi:RespManageVae xmlns:upi="http://npci.org/upi/schema/">

<Head ver="2.0" ts="" orgId="" msgId="" prodType=“UPI” />
<Txn id="" note="" refId="" refUrl="" ts="" type="ManageVae" />
<Resp reqMsgId="" result="SUCCESS|FAILURE" errCode="">

<Ref op="" seqNum="1" addr="" result="SUCCESS|FAILURE" respCode=""/>
<Ref op="" seqNum="2" addr="" result="SUCCESS|FAILURE" respCode=""/>

</Resp>

</upi:RespManageVae>

        Technical Specification Document                               100 | P a g e

4.3.7. Validate Address API

This API will be used by the IPS participants when their customer wants to add a beneficiary within IPS Participant application (for sending money).
This API provides the full form of alias mapped to the short form of alias(From Alias Directory) and beneficiary name in response from the
Payee IPS participant
In case of the Payer mentioned the full form of alias of the Payee, then IPS will send it to Payee IPS participant for retrieving other details of the
beneficiary as mentioned in the specification. In this case the requst will not come to the Alias directory.

Refer Reference Logs Validate Address

4.3.7.1. ReqValAdd

Sr No Message Item

<XML TAG>

Occurrence DataType

Length

M/O/C Rules

1.1
1.1.1

2.1
2.1.1

2.1.2

2.1.3

2.1.4

2.1.5

3.1

API Name
API Schema namespace

<ReqValAdd >
xmlns

Header
Version of the API

id

Time of request from the creator of the
message
Organization
message
Message identifier- used to correlate
between request and response
This field denotes the Product Type

that created

the

information,

Transaction
Carried
throughout the system, visible to all
parties

<Head>
ver

ts

orgId

msgId

prodType

<Txn>

1..1
1..1

1..1
1..1

1..1

1..1

1..1

1..1

1..1

Alphanumeric Min: 1

Alphabetic
Numeric

ISODateTime

Numeric

Alphanumeric

Alphanumeric

Max: 255
Fixed
Min: 1
Max: 6
Min: 1
Max: 255
Min: 1
Max: 20
Length:
35
Fixed

Alphabetic

Fixed

M
M

M
M

M

M

M

M

M

019_Head_Version

020_Head_ts

055_OrgId

021_Head_MsgId

Value to be passed:
“UPI”

        Technical Specification Document                               101 | P a g e

id

1..1

Alphanumeric

Length:
35

3.1.1

3.1.2

3.1.3

3.1.4

3.1.5

3.1.6

Identifier of the transaction
Unique
across all entities, created by the
originator
Description of the transaction (which will
be printed on Passbook)
Consumer reference number to identify
(like Loan number, etc.)
URL for the transaction

note

refId

refUrl

Transaction origination time by the
creator of the message
Type of the Transaction

ts

type

3.1.7

Customer Ref Number

custRef

4.1

4.1.1

4.1.2

4.1.3

4.1.4

4.1.5

4.2

Details related to the Payer

Alias of the Payer

Name of the Payer

Unique identifier for each transaction
inside a file including payer and payee
Type of the Payer

Merchant Classification Code – MCC

<Payer>

addr

name

seqNum

type

code

Information related to the Payer

<Payer.Info>

1..1

1..1

1..1

1..1

1..1

1..1

1..1

1..1

1..1

1..1

1..1

1..1

1..1

Alphanumeric Min: 1

Max: 50

Alphanumeric Min: 1

Max: 35

Alphanumeric Min: 1

ISODateTime

Code

Alphanumeric

Max: 35
Min: 1
Max: 255
Min:1
Max: 20

Alphabetic

Fixed

Alphanumeric Min:1

Max: 255

Alphanumeric Min:1
Max:
99
Min:1
Max: 3
Fixed

Numeric

Code

M

M

M

M

M

M

M

M

M

M

M

M

022_Txn_UUID

057_note

058_refUrl

020_Head_ts

ValAdd

This is the unique
value generated by
the participant for
the transaction.

This field contains
the Payer alias.
This field contains
the Payer Name

056_seqNum

029_Payer/Payee_T
ype

Numeric

Length=4 M

024_Txn_code

Alphabetic

Fixed

M

The Info tag
maintains
information

        Technical Specification Document                               102 | P a g e

verifying the payer’s
identity. This tag is
populated by the
initiator of a
transaction. The
Identity tag
captures payer
Identity which can
be either of the
following,
National ID /
ACCOUNT

AADHAAR|ACCOU
NT
Payer Name that is
associated with
Account or
National ID
If this tag is present
in Request, then
verifiedAddress
field should be
present with value.
TRUE/FALSE

M

M

M

M

O

M

M

4.2.1

4.2.1.1

Payer Identity Is mandatory for “pay” and
optional for “collect”
Id of the identifier

4.2.1.2

Type of the identifier

<Payer.Info.Ide
ntity>

id

type

1..1

1..1

1..1

4.2.1.3 Name as per the identifier

verifiedName

1..1

Alphabetic

Fixed

Alphanumeric Min: 1

Code

Max: 99
Fixed

Alphanumeric Min: 1

Max: 99

4.3

Rating of the payer

<Payer.Info.Rati
ng>

0..1

Alphabetic

Fixed

4.3.1

verifiedAddress

verifiedAddress 1..1

Code

Boolean

4.4

Details of Device
transaction was Initiated

from which

the

<Payer.Device> 1..1

Alphabetic

Fixed

        Technical Specification Document                               103 | P a g e

4.4.1

Device Tag

4.4.1.1 Name of the property

< Payer.Device
.Tag>

name

1..n

1..n

4.4.1.2 Value of the Properties

5.1

Details related to the Payee

Alias of the Payee

5.1.1

5.1.2

value

<Payee>

addr

1..n

1..1

1..1

1..1

Unique identifier for each transaction

seqNum

Fixed

Fixed

Alphabetic

Code
(MOBILE,
GEOCODE,
LOCATION, IP,
TYPE, ID, OS,
APP,
CAPABILITY,
TELECOM)
Alphanumeric

Fixed
Alphabetic
Alphanumeric Min:1

Max: 255

Alphanumeric Min:1
Max: 3

M

M

M

M

M

M

Sample API message is given below –

<upi:ReqValAdd xmlns:upi="http://npci.org/upi/schema/">

<Head ver="2.0" ts="" orgId="" msgId="" prodType= "UPI”/>
<Txn id="" note="" refId="" refUrl="" ts="" type="ValAdd" custRef="" />
<Payer addr="" name="" seqNum="" type="PERSON|ENTITY" code="">

<Info>

<Identity id="" type="ACCOUNT" verifiedName="" />
<Rating VerifiedAddress="TRUE|FALSE"/>

</Info>
<Device>

<Tag name="MOBILE" value=""/>
<Tag name="GEOCODE" value=""/>
<Tag name="LOCATION" value="" />
<Tag name="IP" value=""/>
<Tag name="TYPE" value=""/>
<Tag name="ID" value=""/>
<Tag name="OS" value=""/>

        Technical Specification Document                               104 | P a g e

<Tag name="APP" value=""/>
<Tag name="CAPABILITY" value=""/>
<Tag name="TELECOM" value=""/>

</Device>

</Payer>
<Payee seqNum="" addr=""/>

</upi:ReqValAdd>

4.3.7.2. RespValAdd

Sr No Message Item

<XML TAG>

Occurrence DataType

Length

M/O/C Rules

1.1

API Name

<RespValAdd > 1..1

1.1.1

API Schema namespace

2.1
2.1.1

2.1.2

Header
Version of the API

Time of request from the creator of the
message

xmlns

<Head>
ver

ts

2.1.3

Organization id that created the message

orgId

2.1.4

Message identifier- used to correlate
between request and response

msgId

2.1.5

This field denotes the Product Type

prodType

1..1

1..1
1..1

1..1

1..1

1..1

1..1

Alphanumeric Min: 1

Alphabetic
Numeric

Max: 255
Fixed
Min: 1
Max: 6
ISODateTime Min: 1

Max: 255

Numeric

Min: 1
Max: 20
Alphanumeric Length:

Alphanumeric

35
Fixed

M

M

M
M

M

M

M

M

3.1

Transaction information, Carried throughout
the system, visible to all parties

<Txn>

1..1

Alphabetic

Fixed

M

        Technical Specification Document                               105 | P a g e

019_Head_Version

020_Head_ts

055_OrgId

021_Head_MsgId

Value to be passed:
“UPI”

3.1.1

3.1.2

3.1.3

Unique Identifier of the transaction across
all entities, created by the originator

id

Description of the transaction (which will be
printed on Passbook)

Consumer reference number to identify (like
Loan number, etc.)

3.1.4

URL for the transaction

note

refId

refUrl

3.1.5

Transaction origination time by the creator
of the message

ts

3.1.6

Type of the Transaction

3.1.7

Customer Ref Number

4.1
4.1.1

Response
Request Message identifier

4.1.2

Result of the transaction

4.1.3

Error code if failed

type

custRef

<Resp>
reqMsgId

result

errCode

1..1

1..1

1..1

1..1

1..1

1..1

1..1

1..1
1..1

1..1

0..1

Alphanumeric Length:

M

022_Txn_UUID

35

Alphanumeric Min: 1

Max: 50

Alphanumeric Min: 1

Max: 35

Alphanumeric Min: 1

Max: 35

ISODateTime Min: 1

Max: 255

Min: 1
Max: 20

Code

Alphanumeric

Alphabetic
Alphanumeric Length=

Fixed

Code

35
Min:1
Max:20

Alphanumeric Min:1

M

M

M

M

M

M

M
M

M

C

M

057_note

058_refUrl

020_Head_ts

ValAdd

This is the unique
value generated by
the participant for
the transaction.

SUCCESS|FAILURE

027_Response_Err
Code

4.1.4

Mask Name of the Beneficiary

maskName

1.1

Alphabetic

Max:20
Min:1
Max:99

4.1.5

4.1.6

Merchant Classification Code -MCC

IFSC code

code

IFSC

1..1

1..1

Numeric

Length= 4 M

024_Txn_code

Alphanumeric Length:

M

11

032_RespPay_RefT
ag_IFSC

        Technical Specification Document                               106 | P a g e

4.1.7

IIN of Account provider

IIN

1.1

Numeric

Length:6 M

4.1.8

Account type

accType

1..1

Code

Fixed

M

4.1.9

If it is an IPS mandate, this field is
mandatory. It will return as UPIMANDATE

pType

0..1

Alphabetic

4.1.10

IPS Number of the alias

cmId

0.1

Numeric

Min:6
Max:16

4.1.11

Alias of the Payer

4.1.12

Initiating Channel

4.1.13

Type of the Payee

addr

channel

type

1.1

1.1

1..1

Alphanumeric Min:1

Alphabetic

Max:255
Fixed

Code

Fixed

        Technical Specification Document                               107 | P a g e

O

C

M

M

M

048_ReqPay_Ac_na
me_Account

This will be used
only in the case of
Mandate
Functionality
If the “addr” field in
request is
populated with
mapper.npci , then
in response the IPS
will send the short
form of alias in this
field
For ex:
addr=976994869@
mapper.npci then
cmId =
“976994869”

Value to be passed:
MOB/USDC
029_Payer/Payee_T
ype

4.2

Feature supported tag

<Resp.FeatureS
upported>

0..n

Alphabetic

4.2.1

Value of the feature supported tag

value

0..n

Numeric

C

M

This will be used
only in the case of
Mandate
Functionality

5.1

This field indicates the Merchant Block.

5.1.1

This field indicates the Merchant Identifier.

<Resp.Merchan
t>

<Resp.Merchan
t.Identifier>

0..1

Alphabetic

Fixed

C

037_ReqPay_Payer/
Payee_MerchantTag

0..1

Alphabetic

Fixed

M

5.1.1.1 This field indicates the SubCode.

subCode

0..1

Code

4

O

5.1.1.2 This field indicates the Merchant Identifier.

mid

5.1.1.3 This field indicates the Store Id.

5.1.1.4 This field indicates the Terminal Identifier. It
is the POS terminal identifier value.

sid

tid

1..1

0..1

0..1

Alphanumeric Min:1

M

Max: 20

Alphanumeric Min: 1

Max: 20

Alphanumeric Min: 1

O

O

Max: 20

5.1.1.5 This field indicates the Merchant Type.

merchantType 0..1

Alphabetic

Fixed

O

        Technical Specification Document                               108 | P a g e

This is the
subcategorization
MCC(Merchant
classification
Code) as per
Merchant.
037_ReqPay_Payer/
Payee_MerchantTag

037_ReqPay_Payer/
Payee_MerchantTag

037_ReqPay_Payer/
Payee_MerchantTag

037_ReqPay_Payer/
Payee_MerchantTag

5.1.1.9

5.1.1.1
0

5.1.11
1

5.1.1.6 This field indicates the Merchant Genre.

5.1.1.7 This field indicates the Merchant

Onboarding Type.

merchantGenr
e

onBoardingTyp
e

0..1

1..1

Alphabetic

Fixed

O

Alphabetic

Fixed

O

037_ReqPay_Payer/
Payee_MerchantTag

037_ReqPay_Payer/
Payee_MerchantTag

5.1.1.8 This field indicates the Merchant Institution
Code. It is the unique ID for each merchant
provided by the acquiring party.

merchantInstC
ode

0..1

Alphanumeric

Min :1
Max :20

O

024_Txn_code

This field indicates the Area pincode

pinCode

0..1

Numeric

Fixed

O

This field indicates the tier of the city

tier

0..1

Alphanumeric Code

O

This field indicates the Registration Id

regIdNo

5.1.2

the Merchant Name

<Resp.Merchan
t.Name>

0..1

1..1

Alphanumeric Max:35

O

Alphabetic

Min: 1
Max: 99

M

5.1.2.1 This field indicates the Brand Name.

brand

1..1

Alphanumeric Min: 1

M

Max: 99

5.1.2.2 This field indicates the Legal Name.

legal

0..1

Alphanumeric Min: 1

O

Max: 99

037_ReqPay_Payer/
Payee_MerchantTag

037_ReqPay_Payer/
Payee_MerchantTag

        Technical Specification Document                               109 | P a g e

5.1.2.3 This field indicates the Franchise Name.

franchise

0..1

Alphanumeric Min: 1

O

5.1.3

Ownership tag

5.1.3.1 Type of ownership

Sample API message is given below –

<Resp.Merchan
t.Ownership>
type

0..1

0..1

Max: 99

Alphabetic

Fixed

Alphabetic

Fixed

M

M

037_ReqPay_Payer/
Payee_MerchantTag

038_ReqPay_Merch
ant

<upi:RespValAdd xmlns:upi="http://npci.org/upi/schema/">

<Head ver="2.0" ts="" orgId="" msgId="" prodType= "UPI"/>
<Txn id="" note="" refId="" refUrl="" ts="" type="ValAdd" custRef= “”/>
<Resp reqMsgId="" result="SUCCESS|FAILURE" errCode="" maskName="" code="" type="" IFSC=""
accType="" IIN="" pType="UPIMANDATE" cmId=”” addr=”” channel=”” >

<Merchant>

<Identifier subCode="" mid="" sid="" tid="" merchantType="" merchantGenre="" pinCode=""
regIdNo="" tier="" onBoardingType="" />
<Name brand="" legal="" franchise=""/>
<Ownership type=""/>

</Merchant>
<FeatureSupported value="" />

</Resp>
</upi:RespValAdd>

Note:

1.  Feature supported value tag is only applicable for mandate
2.  pType: <! –only when payee psp alias is umn@handle, pType=UPIMANDATE -- >
3.  <! – In case mandate functionality is supported by the customer VPA, then psp should send RespValAdd with feature supported tag 01-

MANDATE, otherwise “FeatureSupport” tag itself should not be present. 02 to 09 for future purpose -- >

        Technical Specification Document                               110 | P a g e

4.3.8. Set Credentials API

This API is required for providing a unified channel for resetting and changing IPS PIN across various account providers. This is critical to ensure
customers can easily change IPS PIN via their mobile.

Refer Reference Logs Set Credential API

4.3.8.1. ReqSetCre

Sr No Message Item

<XML TAG>

Occurrence DataType

Length M/O/C Rules

1.1
1.1.1

2.1
2.1.1

2.1.2

API Name
API Schema namespace

Header
Version of the API

<ReqSetCre >
xmlns

<Head>
ver

Time of request from the creator of the
message

ts

2.1.3

Organization id that created the message

orgId

2.1.4

Message
between request and response

identifier- used

to correlate

msgId

2.1.5

This field denotes the Product Type

prodType

3.1

3.1.1

Transaction
Carried
throughout the system, visible to all parties

information,

<Txn>

Unique Identifier of the transaction across
all entities, created by the originator

id

1..1
1..1

1..1
1..1

1..1

1..1

1..1

1..1

1..1

1..1

Alphanumeric Min: 1

Alphabetic
Numeric

ISODateTime

Numeric

Alphanumeric

Max: 255
Fixed
Min: 1
Max: 6
Min: 1
Max: 255

Min: 1
Max: 20
Length:
35

Alphanumeric

Fixed

Alphabetic

Fixed

Alphanumeric

Length:
35

M
M

M
M

M

M

M

M

M

M

019_Head_Versio
n
020_Head_ts

055_OrgId

021_Head_MsgId

Value to be
passed: “UPI”

022_Txn_UUID

        Technical Specification Document                               111 | P a g e

3.1.2

3.1.3

Description of the transaction (which will be
printed on Passbook)

note

Consumer reference number to identify
(like Loan number, etc.)

refId

3.1.4

URL for the transaction

refUrl

3.1.5

Transaction origination time by the creator
of the message

ts

3.1.6

Type of the Transaction

type

3.1.8

Common Library Version

clVersion

1..1

1..1

1..1

1..1

1..1

1..1

Alphanumeric Min: 1

Max: 50

Alphanumeric Min: 1

Max: 35

Alphanumeric Min: 1

ISODateTime

Code

Alphanumeric

Max: 35
Min: 1
Max: 255

Min: 1
Max: 20
Fixed
Length
=15

M

M

M

M

M

M

        Technical Specification Document                               112 | P a g e

057_note

058_refUrl

020_Head_ts

SetCre

The clVersion field
will follow an
alphanumeric
format with
validation
structured as:
clVersion-
subVersion-
expiryOfPublicKe
y
Each component
is separated by a
hyphen (‘-’). A
sample value
along with a
detailed
explanation has
been included in
the Common

Library document
for clarity.

4.1

Details related to the Payer

4.1.1

Alias Of the Payer

4.1.2

Name of the Payer

<Payer>

addr

name

4.1.3

Unique Identifier of the transaction across
all entities, created by the originator

seqNum

4.1.4

Type of the Payer

type

4.1.5

Merchant Classification Code – MCC

code

1..1

1..1

1..1

1..1

1..1

1..1

Alphabetic

Fixed

Alphanumeric Min:1

Max: 255

Alphanumeric Min:1

Numeric

Max:99
Min:1
Max:3

M

M

M

M

Code

Fixed

M

Numeric

Length:4 M

029*Payer/Payee*
Type
024_Txn_code

4.2

Details of Device
transaction was Initiated

from which

the

<Payer.Device> 1..1

Alphabetic

Fixed

4.2.1

Device Tag

4.2.1.1 Name of the property

<Payer.Device.
Tag>
name

1..n

1..n

Fixed

Fixed

Alphabetic

code (MOBILE,
GEOCODE,
LOCATION, IP,
TYPE, ID, OS,
APP,
CAPABILITY,
TELECOM)

M

M

M

4.2.1.2 Value of the Properties

value

1..n

Alphanumeric

M

        Technical Specification Document                               113 | P a g e

4.3

This field indicates Account details of the
Payer

<Payer.Ac>

1..1

Alphabetic

Fixed

M

4.3.1

This field indicates Type of the alias

addrType

4.3.2

This field indicates Details related to Payer
Alias

4.3.2.1 This field indicates Name of the property

<Payer.Ac.Deta
il>
name

4.3.2.2 This field indicates Value of the property

value

1..1

1..n

1..n

1..n

Code

Alphabetic

Code

Min: 1
Max: 20
Min: 1
Max:255
Fixed

Alphanumeric Min: 1

4.4

4.4.1

This field indicates Information related to
Payer Credentials
This field indicates Credentials used to
authenticate the request

<Payer.Creds> 1..1

Alphabetic

<Payer.Creds.
Cred>

1..1

Alphabetic

Max: 20
Min: 1
Max: 20
Min: 1
Max: 20

M

M

M

M

M

M

Only one entity is
allowed for a
payer
046_ReqPay_Ac_a
ddrType

048_ReqPay_Ac_n
ame_Account

040_ReqPay_Cred
block
007_ReqPay_PreA
pproved
025_Response_A
pprovalNum

4.4.1.1 This

field

indicates Type of

financial

type

instrument used for authentication

4.4.1.2 This field indicates subType

subType

4.4.2

field

This
encrypted authentication data

indicates base-64 encoded/

4.4.2.1 Code for Cred

4.4.2.2 Key date

<Payer.Creds.
Cred.Data>

code

ki

1..1

1..1

1..1

1..1

1..1

Code

Code

Fixed

Fixed

M

M

PIN

MPIN

Alphabetic

Fixed

M

Alphabetic

Fixed

M

Alphanumeric

Length:8 M

        Technical Specification Document                               114 | P a g e

4.4.3

This field indicates Information related to
Payer Credentials

<Payer.NewCre
d>

1..1

Alphabetic

Min: 1
Max: 20

M

This field
contains the new
IPS pin that needs
to be set

4.4.4

This field indicates Credentials used to
authenticate the request

<Payer.NewCre
d.Cred>

4.4.4.1 This

field

indicates Type of

financial

type

instrument used for authentication

1..1

1..1

Alphabetic

Min: 1
Max: 20

M

Code

Fixed

M

PIN

4.4.4.2 This field indicates subType

subType

1..1

Code

Fixed

M

MPIN

4.4.5

field

This
encrypted authentication data

indicates base-64 encoded/

<Payer.NewCre
d.Cred.Data>

1..1

Alphabetic

4.4.5.1 Code for Cred

4.4.5.2 Key date

code

ki

1..1

1..1

Max:
1000

Fixed

M

M

Alphabetic

Alphanumeric

Length:8 M

Sample API message is given below –

<upi:ReqSetCre xmlns:upi="http://npci.org/upi/schema/">

<Head ver="2.0" ts="" orgId="" msgId="" prodType=”UPI”/>
<Txn id="" note="" refId="" refUrl="" ts="" type="SetCre" />
<Payer addr="" name="" seqNum="" type="PERSON|ENTITY" code="">

<Device>

<Tag name="MOBILE" value=""/>
<Tag name="GEOCODE" value=""/>
<Tag name="LOCATION" value="" />
<Tag name="IP" value=""/>
<Tag name="TYPE" value=""/>
<Tag name="ID" value=""/>
<Tag name="OS" value=""/>

        Technical Specification Document                               115 | P a g e

<Tag name="APP" value=""/>
<Tag name="CAPABILITY" value=""/>
<Tag name="TELECOM" value=""/>

</Device>
<Ac addrType="ACCOUNT">

<Detail name="IFSC" value=""/>
<Detail name="ACTYPE" value=""/>
<Detail name="ACNUM" value=""/>

</Ac>
<Creds>

<Cred type="PIN" subType=" MPIN">
<Data> base-64 encoded/encrypted authentication data</Data>
</Cred>

</Creds>
<NewCred>

<Cred type="PIN" subType=" MPIN">
<Data> base-64 encoded/encrypted authentication data</Data>
</Cred>

</NewCred>

</Payer>
</upi:ReqSetCre>

4.3.8.2. RespSetCre

Sr. No Message Item

<XML TAG>

Occurrence

DataType

Length

M/O/C Rules

1.1
1.1.1

API Name
API Schema namespace

<RespSetCre >
xmlns

1..1
1..1

Alphanumeric Min: 1 Max:

255

2.1

Header

<Head>

1..1

Alphabetic

Fixed

M
M

M

        Technical Specification Document                               116 | P a g e

2.1.1

Version of the API

2.1.2

Time of request from the
creator of the message

ver

ts

2.1.3

2.1.4

Organization id that created
the message

Message identifier- used to
correlate between request and
response

orgId

msgId

1..1

1..1

1..1

1..1

Numeric

Min: 1
Max: 6

ISODateTime Min: 1

M

M

019_Head_Version

020_Head_ts

Numeric

Max: 255

Min: 1
Max: 20

M

055_OrgId

Alphanumeric Length: 35 M

021_Head_MsgId

2.1.5

This field denotes the Product
Type

prodType

1..1

Alphanumeric Fixed

Value to be passed:
“UPI”

M

M

Transaction information,
Carried throughout the
system, visible to all parties

<Txn>

1..1

Alphabetic

Fixed

Unique Identifier of the
transaction across all entities,
created by the originator

id

Description of the transaction
(which will be printed on
Passbook)

Consumer reference number
to identify (like Loan number,
etc.)

note

refId

1..1

Alphanumeric Length: 35 M

022_Txn_UUID

1..1

1..1

Alphanumeric Min: 1

M

057_note

Max: 50

Alphanumeric Min: 1

M

Max: 35

        Technical Specification Document                               117 | P a g e

3.1

3.1.1

3.1.2

3.1.3

3.1.4

URL for the transaction

refurl

3.1.5

Transaction origination time by
the creator of the message

ts

3.1.6

Type of the Transaction

type

4.1
4.1.1
4.1.2

Response
Request Message Identifier
Result of the transaction

<Resp>
reqMsgId
 result

4.1.3

Error code if failed

errCode

Sample API message is given below –

1..1

1..1

1..1

1..1
1..1
1..1

1..1

Alphanumeric Min: 1

Max: 35

ISODateTime Min: 1

M

M

058_refUrl

020_Head_ts

Code

Max: 255

Min: 1
Max: 20

M

SetCre

Fixed

Alphabetic
M
Alphanumeric Length= 35 M
M
Code

Min:1
Max:20

SUCCESS|FAILURE

Alphanumeric Min:1

C

027_Response_ErrCode

Max:20

<upi:RespSetCre xmlns:upi="http://npci.org/upi/schema/">

<Head ver="2.0" ts="" orgId="" msgId="" prodType=“UPI”/>
<Txn id="" note="" refId="" refUrl="" ts="" type="SetCre"/>
<Resp reqMsgId="" result="SUCCESS|FAILURE" errCode=""/>

</upi:RespSetCre>

        Technical Specification Document                               118 | P a g e

4.3.9. Mobile Banking Registration API

This API allows the customer to set new IPS PIN for the first time. IPS participant will send the “FORMAT1” or “FORMAT2”to the remitter banks based
on their readiness. Cred block with subtype “ATMPIN” is allowed only for FORMAT2.

Refer Reference Logs Mobile Banking Registration API

4.3.9.1. ReqRegMob

Sr No Message Item

<XML TAG>

1.1

API Name

<ReqRegMob>

1.1.1 API Schema namespace

xmlns

2.1
Header
2.1.1 Version of the API

<Head>
 ver

2.1.2

Time of request from the creator of
the message

ts

Occurren
ce
1..1

1..1

1..1
1..1

1..1

2.1.3 Organization id that created the

orgId

1..1

Numeric

message

2.1.4 Message identifier- used to correlate

msgId

1..1

Alphanumeric

between request and response

2.1.5

This field denotes the Product Type

prodType

1..1

Alphanumeric

Fixed

        Technical Specification Document                               119 | P a g e

DataType

Length

M/O/C Rules

Alphabetic

Fixed

Alphanumeric Min: 1

Alphabetic
Numeric

ISODateTime

Max: 255
Fixed
Min: 1
Max: 6
Min: 1
Max: 255

Min: 1
Max: 20

Length:
35

M

M

M
M

M

M

M

M

019_Head_Version

020_Head_ts

055_OrgId

021_Head_MsgId

Value to be passed:
“UPI”

3.1

Transaction information, Carried
throughout the system, visible to all
parties

<Txn>

1..1

Alphabetic

Fixed

M

3.1.1 Unique Identifier of the transaction

id

1..1

Alphanumeric

Length:
35

across all entities, created by the
originator

3.1.2 Description of the transaction (which
will be printed on Passbook)

3.1.3 Consumer reference number to
identify (like Loan number, etc.)

3.1.4 URL for the transaction

3.1.5

Transaction origination time by the
creator of the message

3.1.6

Type of the Transaction

note

refId

refUrl

ts

type

3.1.7 Common Library Version

clVersion

1..1

Alphanumeric Min: 1

1..1

1..1

1..1

1..1

1..1

Max: 50

Alphanumeric Min:1

Max: 35

Alphanumeric Min: 1

ISODateTime

Code

Alphanumeric

Max: 35
Min: 1
Max: 255

Min: 1
Max: 20
Fixed
Length
=15

M

M

M

M

M

M

M

022_Txn_UUID

057_note

058_refUrl

020_Head_ts

ReqRegMob

The clVersion field
will follow an
alphanumeric
format with
validation
structured as:
clVersion-
subVersion-
expiryOfPublicKey
Each component is
separated by a
hyphen (‘-’). A

        Technical Specification Document                               120 | P a g e

sample value along
with a detailed
explanation has
been included in
the Common
Library document
for clarity.

029_Payer/Payee_T
ype
024_Txn_code

4.1

Details related to the Payer

4.1.1 Alias Of the Payer

4.1.2 Name of the Payer

<Payer>

addr

name

4.1.3 Unique identifier for each

seqNum

transaction inside a file including
payer and payee
Type of the Payer

4.1.4

type

4.1.5 Merchant Classification Code – MCC

code

4.2

Details of Device from which the
transaction was Initiated

<Payer.Device>

1..1

1..1

1..1

1..1

1..1

1..1

1..1

Alphabetic

Fixed

Alphanumeric Min:1

Max:255

Alphanumeric Min:1

Numeric

Max:99
Min:1
Max:3

Code

Fixed

M

M

M

M

M

Numeric

Length:4 M

Alphabetic

Fixed

M

4.2.1 Device Tag

<Payer.Device.Tag>

1..n

Alphabetic

Fixed

M

        Technical Specification Document                               121 | P a g e

4.2.1.
1

4.2.1.
2
4.3

Name of the property

name

1..n

Fixed

M

code (MOBILE,
GEOCODE,
LOCATION, IP,
TYPE, ID, OS,
APP,
CAPABILITY,
TELECOM)

Value of the Properties

value

1..n

Alphanumeric

This field indicates Account details of
the Payer

<Payer.Ac>

1..1

Alphabetic

Fixed

4.3.1

This field indicates Type of the alias

addrType

1..1

Code

4.4

This field indicates Details related to
Payer Alias

<Payer.Ac.Detail>

1..n

Alphabetic

Min :1
Max: 20
Min:1
Max:255

4.4.1

4.4.2

This field indicates Name of the
property
This field indicates Value of the
property

name

value

5.1

New credentials for Authentication

<RegDetails>

5.1.1

Type of the Cred detail

type

1..n

1..n

1.1

1.1

Code

Fixed

Alphanumeric Min:1

Max: 20

Alphabetic

Fixed

Alphabetic

Fixed

5.1.2 Details tag

<RegDetails.Details>

1..1

Alphabetic

Fixed

5.1.2.
1

This field indicates Name of the
property

name

1..n

Alphabetic

Fixed

        Technical Specification Document                               122 | P a g e

M

M

M

M

M

M

M

M

M

M

Only one entity is
allowed for a payer

046_ReqPay_Ac_ad
drType

048_ReqPay_Ac_na
me_Account

059_Detail.name

5.1.4

5.2

This field indicates Value of the
property
This field indicates Information
related to Payer Credentials

5.3

Cred Tag

value

1..n

Numeric

Max:20

M

<RegDetails.Creds>

1..1

Alphabetic

<RegDetails.Creds.Cr
ed>

1..1

Alphabetic

Min :1
Max: 20

Min: 1
Max: 20

M

M

5.3.1 Cred type
5.3.2 Cred Subtype
5.3.3 Data for Cred

5.3.4 Code for Cred
5.3.5

Key date

Sample API message is given below –

type
subtype
<RegDetails.Creds.Cr
ed.Data>
code
ki

1..1
1..1
1..1

1..1
1..1

Alphabetic
Alphabetic
Alphabetic

Fixed
Fixed
Fixed

Alphabetic
Alphanumeric

Fixed
Length:8

M
M
M

M
M

<upi:ReqRegMob xmlns:upi="http://npci.org/upi/schema/">

<Head ver="2.0" ts="" orgId="" msgId="" prodType=“UPI”/>
<Txn id="" note="" refId="" refUrl="" ts="" type="ReqRegMob"/>
<Payer addr="" name="" seqNum="" type="PERSON|ENTITY" code="">

<Device>

<Tag name="MOBILE" value=""/>
<Tag name="GEOCODE" value=""/>
<Tag name="LOCATION" value="" />
<Tag name="IP" value=""/>
<Tag name="TYPE" value=""/>
<Tag name="ID" value=""/>
<Tag name="OS" value=""/>

        Technical Specification Document                               123 | P a g e

040_ReqPay_Credb
lock
007_ReqPay_PreAp
proved
025_Response_App
rovalNum

Format: yyyymmdd

<Tag name="APP" value=""/>
<Tag name="CAPABILITY" value=""/>
<Tag name="TELECOM" value=""/>

</Device>
<Ac addrType="ACCOUNT">

<Detail name="IFSC" value=""/>
<Detail name="ACTYPE" value=""/>
<Detail name="ACNUM" value=""/>

</Ac>

</Payer>

<RegDetails type="FORMAT1|FORMAT2|FORMAT6|FORMAT7">
<Creds>

<Cred type="CARD" subType="CARDDETAILS">

<Data code="" ki="">base-64 encoded/encrypted authentication data </Data>

</Cred>
<Cred type="OTP" subType="SMS|EMAIL|HOTP|TOTP">

<Data code="" ki="">base-64 encoded/encrypted authentication data</Data>

</Cred>
<Cred type="PIN" subType=" MPIN">

<Data code="" ki="">base-64 encoded/encrypted authentication data</Data>

</Cred>
<Cred type="PIN" subType="ATMPIN|WALLETPIN">

<Data code="" ki="">base-64 encoded/encrypted authentication data</Data>

</Cred>

</Creds>
</RegDetails>

</upi:ReqRegMob>

Note:
Cred Block:

1.  Card Type will come based on card details being captured at APP or CL -- >

a. <! – The below block will be used if the payer psp is getting the card details in the APP itself -- ><Detail  name=”MOBILE”
value=””/><Detail name=”CARDDIGITS” value=””/><last 6 digit of card no><Detail name=”EXPDATE” value=””/># MMYY format

        Technical Specification Document                               124 | P a g e

2. Cred Type : Consists of MOBILE, CARD DIGITS, EXPDATE! 3. Cred Type = “OTP”: <! This cred block is used when the payer psp has upgraded to new CL version, which supports capture of card detail in

CL itself-- >

4.  <! –The formation of the cred blocks will depend on the remitter bank supported format as given below

FORMAT1 – Cred type = “ “PIN” and (subType =”MPIN”).
This will be used while Onboarding through the USSD only for accountType=”Account”

FORMAT2 – Cred type = “OTP” (subType=”SMS”), “PIN” (subType =”MPIN”) and “PIN” (subType =”ATMPIN”) ATM_REDIRECT – Cred
type = “OTP” (subType=”SMS”), “PIN” (subType =”MPIN”) and “PIN” (subType =”ATMPIN”) ATMPIN block will contain the value
passed by remitter bank page -->
This will be used while onboarding through the Card Details using the card details and pin for account type =”ACCOUNT”

FORMAT6: Cred type = “OTP” (subType=”SMS”), “PIN” (subType =”MPIN”).
This will be used while onboarding through the National Id.

FORMAT7: Cred type = “OTP” (subType=”SMS”), “PIN” (subType =”MPIN”) and “PIN” (subType =”WALLETPIN”).
This will be used while onboarding through the WALLET PIN through mobile application.

FORMAT7 – Cred type = “ “PIN” and (subType =”MPIN”)

Cred type = “ “PIN” and (subType =”WALLETPIN”)

This will be used while Onboarding through the USSD only for accountType=”WALLET”.
The SOV provider will have to check the source of request(USSD or application) to decide whether three parameters(OTP, wallet
pin and MPIN) or two parameters(wallet pin and MPIN) will be considered for registration.
If Payer.device.tag.type field is “USDC” then its USSD channel and if its “MOB” then its Mobile appliation channel.

        Technical Specification Document                               125 | P a g e

4.3.9.2. RespRegMob

Sr No Message Item

<XML TAG>

Occurrence DataType

Length

M/O/C Rules

API Name

1.1
1.1.1 API Schema namespace

<RespRegMob >
 xmlns

2.1
Header
2.1.1 Version of the API

<Head>
 ver

2.1.2

Time of request from the creator of
the message

ts

2.1.3 Organization id that created the

orgId

message

2.1.4 Message identifier- used to

msgId

2.1.5

3.1

correlate between request and
response
This field denotes the Product Type

Transaction information, Carried
throughout the system, visible to all
parties

prodType

<Txn>

1..1
1..1

1..1
1..1

1..1

1..1

1..1

1..1

1..1

Alphabetic
Fixed
Alphanumeric Min: 1

Alphabetic
Numeric

ISODateTime

Numeric

Alphanumeric

Max: 255
Fixed
Min: 1
Max: 6
Min: 1
Max: 255
Min: 1
Max: 20
Length: 35

Alphanumeric

Fixed

Alphabetic

Fixed

M
M

M
M

M

M

M

M

M

019_Head_Version

020_Head_ts

055_OrgId

021_Head_MsgId

Value to be passed:
“UPI”

3.1.1 Unique Identifier of the transaction

id

1..1

Alphanumeric

Length: 35

M

022_Txn_UUID

across all entities, created by the
originator

3.1.2 Description of the transaction

note

(which will be printed on Passbook)

3.1.3 Consumer reference number to
identify (like Loan number, etc.)

refId

1..1

1..1

Alphanumeric Min: 1

Max: 50

Alphanumeric Min: 1

M

M

Max: 35

        Technical Specification Document                               126 | P a g e

3.1.4 URL for the transaction

refUrl

3.1.5

3.1.6

4.1
4.1.1

Transaction origination time by the
creator of the message
Type of the Transaction

ts

type

Response
Request Message
Identifier

<Resp>
reqMsgId

4.1.2 Result of the transaction

result

4.1.3

Error code if failed

errCode

1..1

1..1

1..1

1..1
1..1

1..1

0..1

Sample API message is given below –

Alphanumeric Min: 1

ISODateTime

Code

Alphabetic
Alphanumeric

Code

Max: 35
Min: 1
Max: 255
Min: 1
Max: 20
Fixed
Length= 35

Min:1
Max
:20

Alphanumeric Min:1

Max:20

M

M

M

M
M

M

C

058_refUrl

020_Head_ts

ReqRegMob

SUCCESS|FAILURE

027_Response_Err
Code

<upi:RespRegMob xmlns:upi="http://npci.org/upi/schema/">

<Head ver="1.0|2.0" ts="" orgId="" msgId="" prodType=“UPI”/>
<Txn id="" note="" refId="" refUrl="" ts="" type="ReqRegMob"/>
<Resp reqMsgId="" result="SUCCESS|FAILURE" errCode=""/>

</upi:RespRegMob>

        Technical Specification Document                               127 | P a g e

4.3.10.

Check Transaction Status API

This API allows the IPS participants to request for the status of the transaction. The IPS participants must request for status only after the
specified timeout period.IPS can request check transaction request for status only after the specified timeout period to IPS Partcipants.

Refer Reference Logs Check Transaction

4.3.10.1. ReqChkTxn

Sr No Message Item

<XML TAG>

Occurrence

DataType

Length

M/O/C Rules

API Name

1.1
1.1.1 API Schema namespace

<ReqChkTxn>
 xmlns

2.1
Header
2.1.1 Version of the API

<Head>
 ver

2.1.2

Time of request from the creator of the
message

ts

2.1.3 Organization

id

that created

the

orgId

message

2.1.4 Message identifier- used to correlate
between request and response
This field denotes the Product Type

2.1.5

msgId

prodType

3.1

Transaction
information, Carried
throughout the system, visible to all
parties

<Txn>

3.1.1 Unique Identifier of the transaction
across all entities, created by the

id

1..1
1..1

1..1
1..1

1..1

1..1

1..1

1..1

1..1

1..1

Alphanumeric Min: 1

Alphabetic
Numeric

Max: 255
Fixed
Min: 1
Max: 6
ISODateTime Min: 1

Numeric

Max: 255
Min: 1
Max: 20

M
M

M
M

M

M

019_Head_Version

020_Head_ts

055_OrgId

Alphanumeric Length: 35 M

021_Head_MsgId

Alphanumeric Fixed

Alphabetic

Fixed

M

M

Value to be passed:
“UPI”

Alphanumeric Length: 35 M

022_Txn_UID

        Technical Specification Document                               128 | P a g e

originator

3.1.2 Description of the transaction (which
will be printed on Passbook)

note

3.1.3 Consumer

reference number

to

refId

identify (like Loan number, etc.)

3.1.4 URL for the transaction

refUrl

3.1.5

3.1.6

Transaction origination time by the
creator of the message
Type of the Transaction

ts

type

3.1.7 Customer Ref Number

custRef

1..1

1..1

1..1

1..1

1..1

1..1

Alphanumeric Min: 1

Max: 50

Alphanumeric Min: 1

Max: 35

Alphanumeric Min: 1

Max: 35

ISODateTime Min: 1

Max: 255
Min: 1
Max: 20

Code

Alphanumeric

M

M

M

M

M

M

3.1.8 UMN Number

umn

0..1

Alphanumeric Length:3

C

3.1. 9 Original Request Message Identifier

orgMsgId

Original Request RRN

Original Transaction Id

orgRrn

orgTxnId

Sub Type of the transaction

subtype

Original transaction date time

orgTxnDate

3.1.1
0
3.1.1
1
3.1.1
2
3.1.1
3
3.1.1

5

Alphanumeric Length:3

Numeric

5
Length:1
2

Alphanumeric Length:3

5

Code

ISODateTime Min:11

1..1

0..1

1..1

1..1

1..1

M

O

M

M

M

M

Initiation mode of the transaction

initiationMode

1..1

Code

Max:255
Min:1

        Technical Specification Document                               129 | P a g e

057_note

058_refUrl

020_Head_ts

ChkTxn

This is the unique
value generated by
the participant for
the transaction.
If subType=Mandate
then umn is
mandatory and
type=ChkTxn

030_Txn_SubType

031_Txn_Initiation
mode

Purpose code of the transaction

purpose

Ref Category

refCategory

1..1

0..1

Code

Numeric

Max:3
Min:1
Max:3
Length:2

M

O

4
3.1.1
5
3.1.1
7

Sample API message is given below –

<upi:ReqChkTxn xmlns:upi="http://npci.org/upi/schema/">

<Head ver="2.0" ts="" orgId="" msgId="" prodType= "UPI"/>
<Txn id="" note="" refId="" refUrl="" refCategory="" ts="" type="ChkTxn|BackOffice" custRef= “”
umn="" orgMsgId="" orgRrn="" orgTxnId="" subType="" orgTxnDate="" initiationMode="" purpose="" />

</upi:ReqChkTxn>

Note:

1.  If IPS sends the ReqChkTxn, “subType=DEBIT|CREDIT” to bank.
2.  If IPS participant sends to IPS, then “subType=PAY|COLLECT |REVERSAL|MANDATE
3.  If subType=Mandate, then umn is mandatory and type=ChkTxn
4.  If Chktxn is initiated by IPS then status as per the bank i,e, success or failure with respective response code.
5.  If Chktxn initiated by bank / IPS participants, then status given by IPS as SUCCESS/DEEMED/FAILURE/PENDING along with complete details.

4.3.10.2. RespChkTxn

Sr No Message Item

<XML TAG>

Occurrence DataType

Length

M/O/C

Rules

1.1
1.1.1

2.1
2.1.1

API Name
API Schema namespace

<RespChkTxn > 1..1
1..1
xmlns

Alphanumeric Min: 1

Header
Version of the API

<Head>
ver

1..1
1..1

Alphabetic
Numeric

Max: 255
Fixed
Min: 1
Max: 6

M
M

M
M

019_Head_Version

        Technical Specification Document                               130 | P a g e

2.1.2

2.1.3

2.1.4

2.1.5

3.1

3.1.1

3.1.2

3.1.3

3.1.4

3.1.5

3.1.6

Time of request from the creator of the
message
Organization id that created the
message
Message identifier- used to correlate
between request and response
This field denotes the Product Type

Transaction information on, Carried
throughout the system, visible to all
parties
Unique Identifier of the transaction
across all entities, created by the
originator
Description of the transaction (which
will be printed on Passbook)
Consumer reference number to
identify (like Loan number, etc.)
URL for the transaction

Transaction origination time by the
creator of the message
Type of the Transaction

3.1.7

UMN Number

ts

orgId

msgId

prodType

<Txn>

1..1

1..1

1..1

1..1

1..1

ISODateTime

Numeric

Alphanumeric

M

Min: 1
Max: 255
Min: 1
Max: 20
Length: 35 M

M

Alphanumeric

Fixed

Alphabetic

Fixed

M

M

020_Head_ts

055_OrgId

021_Head_MsgId

Value to be passed:
“UPI”

id

1..1

Alphanumeric

Length: 35 M

022_Txn_UUID

note

refId

refUrl

ts

type

umn

1..1

1..1

1..1

1..1

1..1

0.1

Alphanumeric Min: 1

Max: 50

Alphanumeric Min: 1

Max: 35

Alphanumeric Min: 1

ISODateTime

Code

Alphanumeric

Max: 35
Min: 1
Max: 255
Min: 1
Max: 20
Length:
35

Length:
12

M

M

M

M

M

C

M

057_note

058_refUrl

020_Head_ts

ChkTxn

In case of Mandate
transaction this
needs to be
populated
This is the unique
value generated by
the participant for
the transaction.

3.1.8

Customer Ref Number

custRef

1..1

Alphanumeric

        Technical Specification Document                               131 | P a g e

3.1.9
3.1.10 Original Request Message Identifier

Ref Category

refCategory
orgMsgId

3.1.11 Original Request RRN

3.1.12 Original Transaction Id

orgRrn

orgTxnId

3.1.13
3.1.14 Original transaction date time

Sub Type of the transaction

subtype
orgTxnDate

0..1
1.1

0.1

1.1

1.1
1.1

3.1.15

Initiation mode of the transaction

initiationMode

1.1

3.1.16

Purpose code of the transaction

purpose

4.1
4.1.1

Response
Request Message Identifier

4.1.2

Result of the transaction

4.1.3

Error code if failed

4.1.4

Operation Type

<Resp>
reqMsgId

result

errCode

opType

1.1

1..1
1..1

1..1

0..1

0..1

Numeric
Alphanumeric

Numeric

Alphanumeric

Length:2
Length:
35
Length:
12
Length:
35

Code
ISODateTime Min: 1

Code

Code

Alphabetic
Alphanumeric

Code

Max:255
Min:1
Max:3
Min:1
Max:3
Fixed
Length=
35
Min:1
Max:20

Alphanumeric Min:1

Alphabetic

Max:20
Fixed

O
M

O

M

M
M

M

M

M
M

M

C

C

4.1.5

Transaction response Code

txnRespCode

0..1

Code

Min:1
Max:20

C

        Technical Specification Document                               132 | P a g e

030_Txn_SubType

031_Txn_Initiationm
ode

SUCCESS|FAILURE
|DEEMED|
027_Response_Err
Code
CREATE|UPDATE|R
EVOKE
This field will be
applicable in case
of
subtype=”MANDAT
E”
This will be
populated in case
of
type=”BackOffice”

5.1

5.1.1

This field indicates the Response
Reference
This field indicates the Reference type

<Resp.Ref>

1..n

Alphabetic

Fixed

type

1..1

Code

Fixed

M

M

5.1.2

5.1.3

This field indicates the Sequence
Number (Default value should be set
to 1 except for Autopay)
This field indicates the Payment alias

seqNum

1..1

Numeric

addr

1..1

Alphanumeric

Min: 1
Max:3

Min: 1
Max: 255

M

M

        Technical Specification Document                               133 | P a g e

If Payer initiated the
check transaction,
then IPS provides
details for Payer.
If Payee initiated
the check
transaction, then
IPS provides details
for Payee.
If IPS initiated the
check transaction
to Payer/Payee
then Payer/Payee
will provide
respective Ref
details.

If the Payer
responds to a
CheckTransaction,
then under the Ref
tag, when the type
is PAYER, the addr
field represents the
Payer's Address.

5.1.4

This field indicates the Settlement
Amount

settAmount

1..1

Numeric

Min
Inclusiv
e:0 total
Digits:
15
Min: 1
Max: 3
Length:
6

M

M

M

M

M

M

5.1.5

5.1.6

5.1.7

This field indicates the Settlement
Currency
This field indicates the Approval
Reference Number
This field indicates the Response code

settCurrency

1..1

Text

approvalNum

1..1

Alphanumeric

respCode

1..1

Alphanumeric Min: 1

Max: 20

5.1.8

5.1.9

This field indicates the Registered
name with bank
This field indicates the original amount orgAmount

regName

1..1

1..1

Alphanumeric Min: 1

Numeric

Max: 99
Min
Inclusiv
e:0 total
Digits:
15

5.1.10

This field indicates the Reversal
Response Code

reversalRespC
ode

0..1

Alphanumeric Min: 1

C

Max: 20

        Technical Specification Document                               134 | P a g e

If the Payee
responds to a
CheckTransaction,
then under the Ref
tag, when the type
is PAYEE, the addr
field represents the
Payee's Address.

051_ReqPay_Amou
nt_Value

025_Response_App
rovalNum
This field refers to
the actual
response code of
the transaction.

051_ReqPay_Amou
nt_Value

This will be
populated in case
of

5.1.11

5.1.12

5.1.13

Dispute response code as per back
office system

disputeRespCo
de

0..1

Adjustment date as per back office
system

adjustmentDat
e

0..1

Adjustment flag as per back office
system

adjustmentFlag 0..1

Alphanumeric Min: 1

C

Max: 20

Alphanumeric Min: 1

C

Max: 20

Alphanumeric Min: 1

C

Max: 20

5.1.14

Adjustment raised bank as per back
office system

adjustmentRai
sedBank

0..1

Alphanumeric Min: 1

C

Max: 20

type=”BackOffice”
This will be
populated in case
of
type=”BackOffice”
This will be
populated in case
of
type=”BackOffice”
This will be
populated in case
of
type=”BackOffice”
This will be
populated in case
of
type=”BackOffice”

Sample API message is given below –

If type=”ChkTxn”, then the below RespChktxn will be provided by IPS

<upi:RespChkTxn xmlns:upi="http://npci.org/upi/schema/">

<Head ver="1.0|2.0" ts="" orgId="" msgId="" prodType= "UPI" />
<Txn id="" note="" refId="" refUrl="" refCategory="" ts="" type="ChkTxn" orgMsgId="" orgTxnId=""
orgTxnDate="" initiationMode="" purpose="" umn="" custRef="" subType=""/>
<Resp reqMsgId="" result="SUCCESS|FAILURE|DEEMED|PENDING" errCode="" opType="CREATE|UPDATE|REVOKE">
<Ref type="PAYER" seqNum="" addr="" regName="" settAmount="" orgAmount="" settCurrency=""
acNum="" approvalNum="" accType="" respCode="" reversalRespCode=""/>
<Ref type="PAYEE" seqNum="" addr="" regName="" settAmount="" orgAmount="" settCurrency=""
acNum="" approvalNum="" accType="" respCode="" reversalRespCode=""/>

</Resp>
</upi:RespChkTxn>

        Technical Specification Document                               135 | P a g e

NOTE:

1.  “opType” is applicable if subType=MANDATE.

4.3.11.
This API allows the IPS participants to request for an OTP for a particular customer.

OTP API

Refer Reference Logs OTP API

4.3.11.1. ReqOtp

Sr No Message Item

<XML TAG>

Occurrence DataType

Length

M/O/C Rules

API Name

1.1
1.1.1 API Schema namespace

2.1
Header
2.1.1 Version of the API

<ReqOtp>
xmlns

<Head>
ver

2.1.2

Time of request from the creator of the
message

ts

2.1.3 Organization id that created the message orgId

2.1.4 Message

identifier- used to correlate

msgId

between request and response
This field denotes the Product Type

2.1.5

prodType

3.1

Transaction

information,

Carried <Txn>

1..1
1..1

1..1
1..1

1..1

1..1

1..1

1..1

1..1

Alphanumeric Min: 1

Alphabetic
Numeric

Max: 255
Fixed
Min: 1
Max: 6
ISODateTime Min: 1

Numeric

Max: 255
Min: 1
Max: 20

M
M

M
M

M

M

019_Head_Version

020_Head_ts

055_OrgId

Alphanumeric Length: 35 M

021_Head_MsgId

Alphanumeric Fixed

Alphabetic

Fixed

M

M

Value to be passed:
“UPI”

        Technical Specification Document                               136 | P a g e

throughout the system, visible to all
parties

3.1.1 Unique Identifier of the transaction across
all entities, created by the originator
3.1.2 Description of the transaction (which will

id

note

be printed on Passbook)

3.1.3 Consumer reference number to identify

refId

(like Loan number, etc.)
3.1.4 URL for the transaction

refUrl

3.1.5

3.1.6

Transaction origination time by the creator
of the message
Type of the Transaction

ts

type

4.1
4.1.1

Details related to the Payer
Alias Of the Payer

4.1.2 Name of the Payer

4.1.3 Unique

identifier for each transaction

inside a file including payer and payee
Type of the Payer

4.1.4

4.1.5 Merchant Classification Code – MCC
from which
4.2

Details of Device
transaction was Initiated

the

4.2.1 Device Tag

Name of the property

4.2.1.
1

<Payer>
addr

name

seqNum

type

code
<Payer.Device

>

<Payer.Device
.Tag>
name

1..1

1..1

1..1

1..1

1..1

1..1

1..1
1..1

1..1

1..1

1..1

1..1
1..1

1..n

1..n

Alphanumeric Length: 35 M

022_Txn_UUID

057_note

058_refUrl

020_Head_ts

Otp

029_Payer/Payee_Ty
pe
024_Txn_code

Alphanumeric Min: 1

Max: 50

Alphanumeric Min: 1

Max: 35

Alphanumeric Min:1

Max: 35

ISODateTime Min: 1

Code

Max: 255
Min: 1
Max: 20
Fixed
Alphabetic
Alphanumeric Min:1

Alphanumeric Min:1

Max: 255

Numeric

Code

Max:99
Min:1
Max: 3
Fixed

M

M

M

M

M

M
M

M

M

M

Numeric
Alphabetic

Length = 4 M
M
Fixed

Fixed

Fixed

M

M

Alphabetic

code
(MOBILE,
GEOCODE,
LOCATION,
IP, TYPE, ID,

        Technical Specification Document                               137 | P a g e

4.2.1.
2
4.3

4.3.1

Value of the Properties

value

This field indicates Account details of the
Payer
This field indicates Type of the alias

<Payer.Ac>

addrType

4.4

4.4.1

This field indicates Details related to Payer
Alias
This field indicates Name of the property

4.4.2

This field indicates Value of the property

<Payer.Ac.Det
ail>

name

value

1..n

1..1

1..1

1..n

1..n

1..n

OS, APP,
CAPABILITY,
TELECOM)
Alphanumeric

Alphabetic

Fixed

Code

Min:1
Max: 20

Alphabetic Min:1

Code

Alphanumeric

Max: 255
Fixed

Min: 1
Max: 20

M

M

M

M

M

M

Only one entity is
allowed for a payer

046_ReqPay_Ac_add
rType

048_ReqPay_Ac_na
me_Account

Sample API message is given below –

<upi:ReqOtp xmlns:upi="http://npci.org/upi/schema/">

<Head ver="2.0" ts="" orgId="" msgId="" prodType=“UPI”/>
<Txn id="" note="" refId="" refUrl="" ts="" type="Otp" />
<Payer addr="" name="" seqNum="" type="PERSON|ENTITY" code="">

<Device>

<Tag name="MOBILE" value=""/>
<Tag name="GEOCODE" value=""/>
<Tag name="LOCATION" value="" />
<Tag name="IP" value=""/>
<Tag name="TYPE" value=""/>
<Tag name="ID" value=""/>
<Tag name="OS" value=""/>
<Tag name="APP" value=""/>
<Tag name="CAPABILITY" value=""/>
<Tag name="TELECOM" value=""/>

</Device>

        Technical Specification Document                               138 | P a g e

<Ac addrType="ACCOUNT">

<Detail name="IFSC" value=""/>
<Detail name="ACTYPE" value=""/>
<Detail name="ACNUM" value=""/>

</Ac>
</Payer>

</upi:ReqOtp>

4.3.11.2. RespOtp

Tag No Message Item

<XML TAG>

Occurrence

DataType

Length

M/O/C

Rules

1.1
1.1.1

2.1
2.1.1

2.1.2

2.1.3

2.1.4

2.1.5
3.1

3.1.1

API Name
API Schema namespace

< RespOtp >
xmlns

Header
Version of the API

<Head>
ver

ts

used

orgId

msgId

Time of request from the creator of
the message
Organization id that created the
message
Message
to
identifier-
correlate between request and
response
This field denotes the Product Type prodType
Transaction
information, Carried
throughout the system, visible to
all parties
Unique Identifier of the transaction
across all entities, created by the
originator

<Txn>

id

1..1
1..1

1..1
1..1

1..1

1..1

1..1

1..1
1..1

1..1

Alphanumeric Min: 1

Alphabetic
Numeric

Max: 255
Fixed
Min: 1
Max: 6
ISODateTime Min: 1

Numeric

Max: 255
Min: 1
Max: 20

M
M

M
M

M

M

019_Head_Version

020_Head_ts

055_OrgId

Alphanumeric Length: 35 M

021_Head_MsgId

Alphanumeric Fixed
Fixed
Alphabetic

M
M

Value to be passed: “UPI”

Alphanumeric Length: 35 M

022_Txn_UUID

        Technical Specification Document                               139 | P a g e

057_note

058_refUrl

020_Head_ts

Otp

SUCCESS|FAILURE

027_Response_ErrCode

M

M

M

M

M

M
M

M

C

O

3.1.2

3.1.3

3.1.4

3.1.5

3.1.6

4.1
4.1.1

the

transaction
Description of
(which will be printed on Passbook)
Consumer reference number to
identify (like Loan number, etc.)
URL for the transaction

note

refId

refUrl

Transaction origination time by the
creator of the message
Type of the Transaction

ts

type

Response
Request Message identifier

<Resp>
reqMsgId

4.1.2

Result of the transaction

result

4.1.3

Error code if failed

errCode

1..1

1..1

1..1

1..1

1..1

1..1
1..1

1..1

0..1

Alphanumeric Min: 1

Max: 50

Alphanumeric Min: 1

Max: 35

Alphanumeric Min: 1

Max: 35

ISODateTime Min: 1

Code

Max: 255
Min: 1
Max: 20
Fixed

Alphabetic
Alphanumeric Length=

Code

35
Min:1
Max:20

Alphanumeric Min:1

Max:20

4.1.4

URL redirecting to the Issuer IPS
participants page from CL

securePinUrl

0.1

Alphanumeric

Sample API message is given below –

<upi:RespOtp xmlns:upi="http://npci.org/upi/schema/">

<Head ver="2.0" ts="" orgId="" msgId="" prodType=“UPI”/>
<Txn id="" note="" refId="" refUrl="" ts="" type="Otp" />
<Resp reqMsgId="" result="SUCCESS|FAILURE" errCode="" securePinUrl=""/>

</upi:RespOtp>

        Technical Specification Document                               140 | P a g e

4.3.12.

Balance-Enquiry API

This API allows IPS participants to enquirye balance of customer.

Refer Reference Logs Balance Enquiry

4.3.12.1. ReqBalEnq

Sr No Message Item

<XML TAG>

Occurrence DataType

Length

M/O/C

Rules

1.1
1.1.1

2.1
2.1.1

2.1.2

2.1.3

2.1.4

2.1.5

3.1

3.1.1

3.1.2

3.1.3

API Name
API Schema namespace

<ReqBalEnq>
xmlns

Header
Version of the API

Time of request from the creator of the
message
Organization id that created the message

identifier- used

Message
between request and response
This field denotes the Product Type

to correlate

<Head>
ver

ts

orgId

msgId

prodType

Transaction information Carried throughout
the system, visible to all parties
Unique Identifier of the transaction across all
entities, created by the originator
Description of the transaction (which will be
printed on Passbook)
Consumer reference number to identify (like
Loan number, etc.)

<Txn>

id

note

refId

1..1
1..1

1..1
1..1

1..1

1..1

1..1

1..1

1..1

1..1

1..1

1..1

Alphanumeric Min:1

Alphabetic
Numeric

Max: 255
Fixed
Min: 1
Max: 6
ISODateTime Min:1

Numeric

Max: 255
Min: 1
Max: 20
Alphanumeric Length:

35

Alphanumeric Fixed

Alphabetic

Fixed

Alphanumeric Length:

35

Alphanumeric Min: 1

Max: 50

Alphanumeric Min: 1

Max: 35

M
M

M
M

M

M

M

M

M

M

M

M

019_Head_Version

020_Head_ts

055_OrgId

021_Head_MsgId

Value to be passed:
“UPI”

022_Txn_UUID

057_note

        Technical Specification Document                               141 | P a g e

3.1.4

URL for the transaction

refUrl

3.1.5

3.1.6

Transaction origination time by the creator of
the message
Type of the Transaction

ts

type

3.1.7

Customer Ref number

custRef

1..1

1..1

1..1

1..1

Alphanumeric Min:1

Max: 35

ISODateTime Min:1

Code

Alphanumeric

Max: 255
Min: 1
Max: 20
Length:
12

M

M

M

M

3.1.8

Common Library Version

clVersion

1..1

Alphanumeric Fixed

M

Length
=15

4.1

This field indicates Risk Score related to the
transaction and the entities

<Txn.RiskScore
s>

0..1

Alphabetic

Fixed

O

        Technical Specification Document                               142 | P a g e

058_refUrl

020_Head_ts

BalEnq or BalChk
(Use “BalEnq”)
This is the unique
value generated by
the participant for
the transaction.
The clVersion field
will follow an
alphanumeric
format with
validation
structured as:
clVersion-
subVersion-
expiryOfPublicKey
Each component is
separated by a
hyphen (‘-’). A
sample value along
with a detailed
explanation has
been included in
the Common
Library document
for clarity.

4.2

4.2.1

4.2.2

This field indicates Risk Score related to the
transaction and the entities
This field indicates Entity providing the risk
score
This field indicates Type of risk

<Txn.RiskScore
s.Score>
provider

type

0..n

1..1

1..1

Code

Code

Alphabetic

Fixed

4.2.3

This field indicates Value of risk evaluation

value

1..1

Integer

5.1
5.1.1

Details related to the Payer
Alias of the Payer

5.1.2

Name of the Payer

<Payer>
addr

name

5.1.3

5.1.4

5.1.5
5.2

5.2.1

Unique identifier for each transaction inside
a file including payer and payee
Type of the Payer

seqNum

type

Merchant Classification Code – MCC
This field indicates Information related to the
Payer
This field indicates Payer Identity

code
<Payer.Info>

<Payer.Info.Ide
ntity>

5.2.1.1

This field indicates Id of the identifier

id

5.2.1.2

This field indicates Type of the identifier

type

1..1
1..1

1..1

1..1

1..1

1..1
1..1

1..1

1..1

1..1

5.2.1.3

This field indicates Name as per the identifier verifiedName

1..1

        Technical Specification Document                               143 | P a g e

Min: 1
Max: 20
Min:1
Max: 99

Min: 1
Max: 50

O

M

M

M

M
M

M

M

M

Alphabetic
Fixed
Alphanumeric Min:1
Max:
255

Alphanumeric Min:1
Max:
99
Min:1
Max: 3
Fixed

Numeric

Code

Numeric
Alphabetic

Length = 4 M
Fixed
M

Alphabetic

Alphanumeric

Code

Min: 1
Max: 20

Min: 1
Max: 99

Fixed

Alphanumeric Min:1

Max: 99

M

M

M

M

This will be decided
once
EFRM
finalized.
This will be decided
once
EFRM
finalized.

to value

Default
“1”.
029_Payer/Payee_T
ype
024_Txn_code

This is mandatory
for “pay” and
optional for
“collect”

029*Payer/Payee*
Type

5.2.2

This field indicates Rating of the payer

5.2.2.1

This field indicates the verified Address

0..1

<Payer.Info.Rat
ing>
verifiedAddress 0..1

5.3

5.3.1

Details of Device from which the transaction
was Initiated
Device Tag

5.3.1.1 Name of the property

<Payer.Device

>

<Payer.Device
.Tag>
name

1..1

1..n

1..n

5.3.1.2 Value of the Properties
5.4

This field indicates Account details of the
Payer
This field indicates Type of the alias

value
<Payer.Ac>

addrType

This field indicates Details related to Payer
Alias
This field indicates Name of the property

<Payer.Ac.Deta
il>
name

5.4.2.2

This field indicates Value of the property

value

5.4.1

5.4.2

5.4.2.1

1..n
1..1

1..1

1..n

1..n

1..n

Alphabetic

Fixed

Code

Boolean
TRUE/FA
LSE

Alphabetic

Fixed

Alphabetic

code
(MOBILE,
GEOCODE,
LOCATION, IP,
TYPE, ID, OS,
APP,
CAPABILITY,
TELECOM)
Alphanumeric
Alphabetic

Code

Alphabetic

Code

Alphanumeric

Fixed

Fixed

Fixed

Min: 1
Max: 20

Min: 1
Max: 255
Fixed

Min:1
Max: 20
Min: 1
Max: 20

O

O

M

M

M

M
M

M

M

M

M

M

026_Payer/Payee_I
nfoRating
Default Value as
“TRUE”.

Only one entity is
allowed for a payer
046_ReqPay_Ac_ad
rType

048_ReqPay_Ac_na
me_Account

5.5

This field indicates Information related to
Payer Credentials

<Payer.Creds> 1..1

Alphabetic

        Technical Specification Document                               144 | P a g e

5.5.1

This field indicates Credentials used to
authenticate the request

<Payer.Creds
.Cred>

1..1

Alphabetic

Min: 1
Max: 20

M

5.5.1.1

5.5.1.2

field

indicates Type of

This
instrument used for authenticati on
This field indicates subType

financial

5.5.1.3 Base 64 encoded authentication

5.5.1.4 Code for Cred
5.5.1.5 Key date
5.6

This field indicates Information related to the
amounts in the transaction

type

subType

<Payer.Creds
.Cred.Data>
code
ki
<Payer.Amount

>

1..1

1..1

1..1

1..1
1..1
0..1

Code

Code

Fixed

Fixed

M

M

Alphabetic

Fixed

M

Alphabetic
Alphanumeric
Alphabetic

Fixed
M
Length:8 M
C
Fixed

5.6.1

This field indicates Transaction amount

value

1..1

Numeric

5.6.2

5.6.2.1

5.6.2.1.
1

indicates Currency of

This
field
transaction
This field indicates Details of transaction
amount
This field indicates Name of the property

the

curr

<Payer.Amount
.Split>
name

1..1

0..1

1..n

Text

Alphabetic

Code

        Technical Specification Document                               145 | P a g e

Min
Inclusive:
0
Total
Digits: 15
Min: 1
Max: 3
Fixed

Min: 1
Max: 20

M

M

O

M

040_ReqPay_Credb
lock
007_ReqPay_PreAp
proved
025_Response_App
rovalNum

040_ReqPay_Credb
lock

Format: yyymmdd

This field will be
populated in case
of Txn.type =
“BalChk”
051_ReqPay_Amou
nt_Value

This tag will be for
future purposes.

indicates Value of the property

5.6.2.1.
2
Sample API message is given below –

value

1..n

Alphanumeric Min: 1

M

Max: 99

<upi:ReqBalEnq xmlns:upi="http://npci.org/upi/schema/">

<Head ver="2.0" ts="" orgId="" msgId="" prodType=“UPI”/>
<Txn  id=""  note=""  refId=""  refUrl=""  ts=""  type="BalEnq" custRef= “”>

<RiskScores>

<Score provider="sp" type="TXNRISK" value=""/>
<Score provider="NPCI" type="TXNRISK" value=""/>

</RiskScores>

</Txn>
<Payer addr="" name="" seqNum="" type="PERSON|ENTITY" code="">

<Info>

<Identity id="" type="ACCOUNT" verifiedName="" />
<Rating VerifiedAddress="TRUE|FALSE"/>

</Info>
<Device>

<Tag name="MOBILE" value=""/>
<Tag name="GEOCODE" value=""/>
<Tag name="LOCATION" value="" />
<Tag name="IP" value=""/>
<Tag name="TYPE" value=""/>
<Tag name="ID" value=""/>
<Tag name="OS" value=""/>
<Tag name="APP" value=""/>
<Tag name="CAPABILITY" value=""/>
<Tag name="TELECOM" value=""/>

</Device>
<Ac addrType="ACCOUNT">

<Detail name="IFSC" value=""/>
<Detail name="ACTYPE" value=""/>
<Detail name="ACNUM" value=""/>

</Ac>

        Technical Specification Document                               146 | P a g e

<Creds>

<Cred type="PIN" subType=" MPIN">

<Data> base-64 encoded/encrypted authentication data</Data>

</Cred>

</Creds>
<Amount value="" curr="NAD">

<Split name="PURCHASE|CASHBACK" value=""/>

</Amount>

</Payer>
</upi:ReqBalEnq>

4.3.12.2. RespBalEnq

Tag No Message Item

<XML TAG>

Occurrence DataType

Length

M/O/C Rules

1.1
1.1.1

2.1
2.1.1

API Name
API Schema namespace

Header
Version of the API

<RespBalEnq >
xmlns

<Head>
ver

2.1.2

Time of request from the creator of the message

ts

2.1.3

Organization id that created the message

2.1.4

2.1.5

3.1

Message identifier- used to correlate between
request and response
This field denotes the Product Type

Transaction information, Carried throughout the
system, visible to all parties

<Txn>

orgId

msgId

prodType

1..1
1..1

1..1
1..1

1..1

1..1

1..1

1..1

1..1

Alphanumeric Min: 1

Alphabetic
Numeric

Max: 255
Fixed
Min: 1
Max: 6
ISODateTime Min: 1

Numeric

Alphanumeric

Alphanumeric

Max: 255
Min: 1
Max: 20
Length:
35
Fixed

Alphabetic

Fixed

M
M

M
M

M

M

M

M

M

019_Head_Version

020_Head_ts

055_OrgId

021_Head_MsgId

Value to be passed:
“UPI”

        Technical Specification Document                               147 | P a g e

3.1.1

3.1.2

3.1.3

3.1.4

3.1.5

3.1.6

3.2

3.2.1

3.2.1.1

Unique Identifier of the transaction across all
entities, created by the originator
Description of the transaction (which will be
printed on Passbook)
Consumer reference number to identify (like Loan
number, etc.)
URL for the transaction

id

note

refId

refUrl

Transaction origination time by the creator of the
message
Type of the Transaction

ts

type

1..1

1..1

1..1

1..1

1..1

1..1

This field indicates Risk Score related to the
transaction and the entities
This field indicates Risk Score related to the
transaction and the entities
This field indicates Entity providing the risk score

<Txn.RiskScores

> <Txn.RiskScores
> .Score>
> provider

0..1

0..n

1..1

Alphanumeric

Length:
35

Alphanumeric Min: 1

Max: 50

Alphanumeric Min: 1

Max: 35

Alphanumeric Min: 1

Max: 35

ISODateTime Min: 1

Code

Alphabetic

Max: 255
Min: 1
Max: 20
Fixed

Alphabetic

Fixed

Code

3.2.1.2

This field indicates Type of risk

type

1..1

Code

3.2.1.3

This field indicates Value
of risk evaluation

4.1
4.1.1

4.1.2

Response
Request Message
Identifier
Result of the transaction

4.1.3

Error code if failed

value

1..1

Integer

<Resp>
reqMsgId

result

errCode

1..1
1..1

1..1

0..1

Alphabetic
Alphanumeric

Code

Alphanumeric Min:1

Max:20

        Technical Specification Document                               148 | P a g e

M

M

M

M

M

M

O

O

M

M

M

M
M

M

C

022_Txn_UUID

057_note

058_refUrl

020_Head_ts

BalEnq

This will be
decided once
EFRM finalized.
This will be
decided once
EFRM finalized.

SUCCESS|FAILURE

027_Response_Err
Code

Min: 1
Max:
20
Min: 1
Max:
99
Min: 1
Max:
50
Fixed
Length=3
5
Min:1
Max:20

4.1.4

Authentication code

5.1
5.1.1

Details related to the Payer
Alias of the Payer

5.1.2

Name of the Payer

5.1.3

5.1.4

5.1.5
5.2
5.2.1

Unique identifier for each transaction inside a file
including payer and payee
Type of the Payer

Merchant Classification Code – MCC
Data for For Balance enquiry
Base 64 encoded authentication

actn

<Payer>
addr

name

seqNum

type

code
<Payer.Bal>
<Payer.Bal.Data

>

0..1

1..1
1..1

1..1

1..1

1..1

1..1
1.1
1.1

Numeric

Min:1
Max:4
Alphabetic
Fixed
Alphanumeric Min:1

Max: 255

Alphanumeric Min:1

Numeric

Code

Max: 99
Min:1
Max: 3
Fixed

O

M
M

M

M

M

Numeric
Alphabetic
Alphanumeric

Length=4 M
M
Fixed
M

033_RespPay_Act
Code

029*Payer/Payee*
Type
024_Txn_code

This will contain
base 64 encoded
data, and the
format is given
below before the
encoding.

Sample API message is given below –

<upi:RespBalEnq xmlns:upi="http://npci.org/upi/schema/">

<Head ver="2.0" ts="" orgId="" msgId="" prodType=“UPI”/>
<Txn id="" note="" refId="" refUrl="" ts="" type="BalEnq" >

<RiskScores>

<Score provider="sp" type="TXNRISK" value=""/>
<Score provider="NPCI" type="TXNRISK" value=""/>

</RiskScores>

</Txn>
<Resp reqMsgId="" result="SUCCESS|FAILURE" errCode="" actn=""/>

        Technical Specification Document                               149 | P a g e

<Payer addr="" name="" seqNum="" type="PERSON|ENTITY" code="">

<Bal>

<Data>base-64 encoded/encrypted data</Data>
<Data> Y|N </Data> <!-- if type=BalChk !-->

</Bal>

</Payer>
</upi:RespBalEnq>

BALANCE ENQUIRY FORMAT :
Bal.Data tag contains the encoded string. After decoding it looks like below:

1001356C0000029282001002356C000002916191
The breakdown of the above string is descibed in below table:

Leger Balance: Rs. 29282.00
Available Balance: Rs. 29161.91
It’s on Bank if they want to send both ledger and available balance or anyone.
Amount populated should be in cent

For Ledger- Flag/Value

For Available amount-
Flag/Value

Digit
01-02
00
10
20
30
40
Digit
03-04
00
01
02

Account type
Unspecified/Unknown
Savings
Checking
Credit Card
Cashback
Amount type/
Balance Type
Default
Ledger Balance
Available Balance

        Technical Specification Document                               150 | P a g e

90
Digit
05-07
NNN
Digit 8
C
D
Digit 9-
20

Cashback

Currency code
ISO Currency Code
Amount, sign
Positive balance
Negative balance

Amount

1001356C000002928200 1002356C000002916191

4.3.13.
This API will be used to inform the status of the transaction to IPS participants.

Transaction Confirmation API

Refer Reference Logs Payment Request

4.3.13.1. ReqTxnConfirmation

Sr No Message Item

<XML Tag>

Occurrence Datatype

Length

M/O/C

Rules

1.1
1.1.1
2.1
2.1.1

2.1.2

2.1.3

API Name
API Schema
Header for the message
Version of the API

<ReqTxnConfirmation>
 xmlns
<Head>
ver

Time of request from the
creator of the message
Organization
created the message

that

id

ts

orgId

1..1
1..1
1..1
1..1

1..1

1..1

Alphanumeric
Alphabetic
Numeric

ISODateTime

Numeric

Fixed
Min: 1
Max: 6
Min: 1
Max: 255
Min: 1
Max: 20

M
M
M
M

M

M

019_Head_Versio
n
020_Head_ts

055_OrgId

        Technical Specification Document                               151 | P a g e

2.1.4

2.1.5

3.1

3.1.1

3.1.2

3.1.3

3.1.4

3.1.5

3.1.6
3.1.7

3.1.8

the

field denotes

throughout
visible

information,
the
to all

Message identifier- used to
correlate between request
and response
This
Product Type
Transaction
Carried
system,
parties
Identifier of the
Unique
transaction
all
across
entities, created by the
originator
Description
the
transaction (which will be
printed on Passbook)
Consumer
number to
Loan number, etc.)
URL for the transaction

reference
identify (like

of

origination
Transaction
time by the creator of the
message
refCategory
Original
ID
when reversal/Refund has
to be done
Customer
reference
number for the initiated
transaction

transaction

msgId

1..1

Alphanumeric

Length: 35

M

021_Head_MsgId

prodType

<Txn>

1..1

1..1

Alphanumeric

Fixed

Alphabetic

Fixed

M

M

Value
passed: “UPI”

to

be

id

1..1

Alphanumeric

Length: 35

M

022_Txn_UUID

note

refId

refUrl

ts

refCategory
orgTxnId

1..1

Alphanumeric Min: 1

Max: 50

1..1

Alphanumeric Min: 1

Alphanumeric

ISODateTime

Max: 35

Min:1
Max: 35
Min: 1
Max: 255

Numeric
Alphanumeric

length=2
Length:35

1..1

1..1

0..1
1..1

M

M

M

M

O
M

custRef

1..1

Numeric

Length:12

M

057_note

058_refUrl

020_Head_ts

023*Txn*
orgTxnId

This is the unique
value generated
by the participant

        Technical Specification Document                               152 | P a g e

3.1.9

Initiation mode

initiationMode

3.1.10

Transaction Type

type

3.1.11
3.2.1.3
4.1

4.1.1

purpose code
Transaction Confirmation
Description
the
transaction (which will be
printed on Passbook)
Type of the Transaction

of

purpose
<TxnConfirmation>
note

1..1

1..1

1..1
1..1
1..1

Code

Code

Numeric
Alphabetic
Alphanumeric

Min: 1
Max: 3
Min Length:
1
length=2
Fixed
Min: 1
Max: 50

type

1..1

Code

4.1.2

4.1.3

Original transaction error
code
Original transaction status orgStatus

orgErrCode

4.1.4

Authentication code

actn

4.1.5

Reversal Response Code

reversalRespCode

4.2
4.2.1

Ref tag
Ref type

<TxnConfirmation.Ref>
type

4.2.2
4.2.3

Sequence Number
Payment alias

seqNum
addr

4.2.4

Settlement Amount

settAmount

0..1

1..1

0..1

0..n

1..1
1..1

1..1
1..1

1..1

Code

Code

Numeric

Code

Alphanumeric
Code

Numeric
Alphanumeric

Numeric

        Technical Specification Document                               153 | P a g e

M

M

M
M
M

M

O

M

O

O

M
M

M
M

M

the

for
transaction.
031_Txn_Initiatio
n mode
“TxnConfirmation
”

057_note

012_ReqTxn_Pay
013_ReqTxn_Coll
ect

033_RespPay_Act
Code
028_Response_Rev
ersal

012_ReqTxn_Pay
013_ReqTxn_Coll
ect

051_ReqPay_Am
ount_Value

Min: 1
Max: 20

Min: 1
Max: 20
Min: 1
Max: 20
Min:1
Max:4
Min: 1
Max: 20
Fixed

Length: 4
Min: 1
Max: 255
Min
Inclusive: 0

4.2.5

Settlement Currency

settCurrency

4.2.6

4.2.7

Approval
Number
Response code

Reference

approvalNum

respCode

4.2.8

Registered name with bank

regName

4.2.9

Original amount

orgAmount

4.2.10

Account number

acNum

4.2.11 Merchant Classification

code

4.2.12

Code – MCC
IFSC code

IFSC

4.2.13

Account type

accType

4.2.14

Alias Directory Id/ numeric
Id/cmId

cmId

1..1

1..1

1..1

1..1

1..1

1..1

1..1

1..n

1..n

0.1

Text

Alphanumeric

Alphanumeric

Alphanumeric

Numeric

Alphanumeric

Numeric

total Digits:
15
Min: 1
Max: 3
Length: 6

Min:1
Max: 20
Min:1
Max: 99
Min
Inclusive: 0
total Digits:
15
Min:1
Max: 30
Length: 4

Alphanumeric

Length:11

Code

Fixed

Alphanumeric

Min:6
Max:25

4.2.15 Reversal Response Code

reversalRespCode

0..n

Code

Min:1
Max: 20

Sample API message is given below –

        Technical Specification Document                               154 | P a g e

M

M

M

M

M

M

M

M

M

C

O

025_Response_Ap
provalNum

051_ReqPay_Am
ount_Value

024_Txn_code

032*RespPay_Ref
Tag* IFSC
048*ReqPay_Ac*
name_Account
This will be
populated in case
of transaction
during short form
of alias.
028_Response_Rev
ersal

<upi:ReqTxnConfirmation xmlns:upi=”http://npci.org/upi/schema/”>
<Head ver=”2.0” ts=”” orgId=”” msgId=”” prodType=“UPI”/>

<Txn id=”” note=”” refId=”” refUrl=”” ts=”” type=”TxnConfirmation” orgTxnId=”” initiationMode=””
custRef=”” purpose=”00|01|02|03|04|05|06|07|08|09|10”
refCategory=”00|01|02|03|04|05|06|07|08|09”/>
<TxnConfirmation note=”” orgStatus=”SUCCESS/FAILURE/PENDING”orgErrCode=”” type=””actn=””>
<Ref type=”PAYER|PAYEE” seqNum=”” addr=”” regName=””settAmount=”” orgAmount=””
settCurrency=”” approvalNum=””acNum=""
SAVINGS|CURRENT|DEFAULT|WALLET” respCode=”” reversalRespCode=”” cmId=”” />

IFSC="" code="" accType=”

    </TxnConfirmation>

</upi:ReqTxnConfirmation>

4.3.13.2. RespTxnConfirmation

Sr
No
1.1

Message Item

API Name

1.1.1 API Schema namespace

Header for the message

2.1
2.1.1 Version of the API

<XML Tag>

Occurrence DATATYPE

LENGTH M/O/C Rules

<RespTxnConfir
mation>
xmlns

<Head>
ver

1..1

1..1

1..1
1..1

1..1

1..1

1..1

1..1

Alphanumeric Min: 1

Alphabetic
Numeric

Max: 255
Fixed
Min: 1
Max: 6
ISODateTime Min: 1

Numeric

Max: 255
Min: 1
Max: 20

M

M

M
M

M

M

019_Head_Versio
n
020_Head_ts

055_OrgId

Alphanumeric Length:35 M

021_Head_MsgId

Alphanumeric Fixed

M

Value to be
passed: “UPI”

2.1.2 Time of request from the creator of the

ts

message

2.1.3 Organization id that created the message

orgId

2.1.4 Message identifier-used to correlate between

msgId

request and response

2.1.5 This field denotes the Product Type

prodType

        Technical Specification Document                               155 | P a g e

3.1

Transaction information, Carried throughout
the system, visible to all parties

<Txn>

3.1.1 Unique Identifier of the transaction across all

id

entities, created by the originator

3.1.2 Description of the transaction (which will be

note

printed on Passbook)

3.1.3 Consumer reference number to identify

refId

(like Loan number, etc.)

3.1.4 URL for the transaction

refUrl

3.1.5 Transaction origination time by the creator

ts

of the message

3.1.6 Original transaction ID when reversal/Refund

orgTxnId

has to be done

3.1.7 Customer reference number for the

custRef

initiated transaction

1..1

1..1

1..1

1..1

1..1

1..1

1..1

1..1

Alphabetic

Fixed

Alphanumeric Length:

35

Alphanumeric Min: 1

Max: 50

Alphanumeric Min: 1

Max: 35

Alphanumeric Min: 1

Max: 35

ISODateTime Min: 1

M

M

M

M

M

M

Max: 255

Alphanumeric Length:35 M

Numeric

Length:12 M

3.1.8 Transaction Type

type

1..1

3.1.9

Initiation mode

initiationMode

1..1

refCategory

purpose code

3.1.1
0
3.2.1
.3 4.1
4.1.1 Request Message Identifier
4.1.2 Result of the transaction

Response

refCategory

purpose

<Resp>
reqMsgId
result

1..1

1..1

1..1
1..1
1..1

Code

Code

Numeric

M

Min: 1
Max: 20
Min: 1
Max: 35
length=2 M

M

Numeric

length=2 M

Fixed

M
Alphabetic
Alphanumeric Length:35 M
M
Code

Min: 1
Max: 20

        Technical Specification Document                               156 | P a g e

022_Txn_UUID

057_note

058_refUrl

020_Head_ts

023*Txn*
orgTxnId
This is the unique
value generated
by the participant
for the
transaction.

031_Txn_Initiatio
nmode

4.1.3 Error code if failed

errCode

0..1

Alphanumeric Min:1

C

Max:20

027_Response_Er
rCode

Sample API message is given below –

<upi:RespTxnConfirmation xmlns:upi=”http://npci.org/upi/schema/”>

<Head ver=”2.0” ts=”” orgId=”” msgId=”” prodType=“UPI”/>
<Txn id=”” custRef=”123456789012”note=”” refId=”” refUrl=”” ts=”” type=”TxnConfirmation”
refCategory=”00|01|02|03|04|05|06|07|08|09”
purpose=”00|01|02|03|04|05|06|07|08|09|10” orgTxnId=””initiationMode=””/>
<Resp reqMsgId=”” result=”SUCCESS/Failure” errCode=””/>

</upi:RespTxnConfirmation>

4.3.14.

RegMapper API

This API will facilitate IPS participants Apps to Register/Modify Unique Number at Alias Directory. Using this API user can create a unique number
more than once and can be mapped to active alias. Likewise, the user can also use the mobile number as unique number. The ReqRegMapper API will
store the details in Alias Directory in an encrypted format.
The ReqRegMapper API shall perform various operations in the Alias Directory given below

1. Add – Create a new Merchant ID at the time of registration of alias.
2. Modify – Modify the Merchant ID against alias by selecting any of the created Merchant ID’s or Update the Unique Number as Mobile Number
   against the alias.
   @mapper.npci will be the new handle that shall be appended to the Unique Number (Merchant ID / mobile number) for identifying the request to Alias
   Directory.

Refer Reference Logs RegMapper API

        Technical Specification Document                               157 | P a g e

4.3.14.1. ReqRegMapper

Sr No Message Item
1.1
1.1.1
2.1
2.1.1

API Name
API Schema namespace
Header
Version of the API

<XMLTag>
<ReqRegMapper>   1..1
1..1
xmlns
1..1
<Head>
1..1
ver

Occurrence Datatype

Length

Alphanumeric Min: 1
Fixed
Alphabetic
Min: 1
Numeric
Max: 6

M/O /C Rules
M
M
M
M

019_Head_Version

2.1.2

2.1.3

Time of request from the
creator of the message

ts

Organization id that
created the message

orgId

2.1.4 Message identifier- used

msgId

to correlate between
request and response

This field denotes the
Product Type

Transaction information,
Carried throughout the
system, visible to all
parties

Unique Identifier of the
transaction across all
entities, created by the
originator

Description of the
transaction (which will
be printed on Passbook)

2.1.5

3.1

3.1.1

3.1.2

prodType

<Txn>

1..1

1..1

1..1

1..1

1..1

ISODateTime Min: 1

M

020_Head_ts

Numeric

Max: 255

Min: 1
Max: 20

Alphanumeric Min: 1

Max: 35

Alphanumeric Fixed

Alphabetic

Fixed

M

M

M

M

055_OrgId

021_Head_MsgId

Value to be passed: “UPI”

id

1..1

Alphanumeric Length:

M

022_Txn_UUID

35

note

1..1

Alphanumeric Min: 1

M

057_note

Max: 50

        Technical Specification Document                               158 | P a g e

refId

1..1

Alphanumeric Min: 1

M

3.1.3

Consumer reference
number to identify (like
Loan number, etc.)

3.1.4

URL for the transaction

refUrl

3.1.5

Transaction origination
time by the creator of the
message

ts

3.1.6

Type of the Transaction

type

3.1.7

Operation to be
performed by the request

op

4.1

Details related to the
Payer

<Payer>

4.1.1

Alias of the Payer

addr

4.1.2

Name of the Payer

name

4.1.3

Unique identifier for each
transaction inside a file
including payer and
payee

seqNum

Type of the Payer

4.1.4
4.1.5 Merchant Classification
Code - MCC

type
code

5.1

Details of the
Registration ID

<Payer.RegIdDet
ails>

1..1

1..1

1..1

1..1

1..1

1..1

1..1

1..1

1..1
1..1

1..1

058_refUrl

020_Head_ts

CMREGISTRATION

ADD|MODIFY

Max: 35

Alphanumeric Min: 1

Max: 35

ISODateTime Min: 1

Max: 255

Min: 1
Max: 20

Fixed

Code

Code

Alphabetic

Fixed

Alphanumeric Min: 1

Max: 255

Alphanumeric Min: 1
Max:99

Numeric

Min: 1
Max: 35

M

M

M

M

M

M

M

M

Code
Numeric

Fixed
M
Length: 4 M

PERSON| ENTITY
024_Txn_code

Code

Fixed

M

        Technical Specification Document                               159 | P a g e

5.1.1

RegDetails ID tag

5.1.2

Name

<Payer.RegIdDet
ails.Id>
name

5.1.4

Value

value

6.1

Status of the ID

setStatus

1..1

1..n

1..n

1..1

Alphabetic

Fixed

Alphabetic

Fixed

Alphanumeric Min: 1

Alphabetic

Max: 100

Min: 1
Max: 35

6.1.1
6.1.2

Consent
Name

<Payer.Consent> 1..n
1..1
name

Fixed
Alphabetic
Alphanumeric Min: 1

6.1.3
6.1.4

Value
Previous VPA

6.1.5

Type

value
prevVpa

type

1..1
0..1

1..n

Code
Code

Numeric

Max: 50

Fixed
Min: 6
Max: 9

Fixed

M

M

M

M

M
M

M
C

M

MOBILE|NUMERICID

ACTIVE|INACTIVE|BLOCK|UNBLOCK
|DEREGISTER

CMREGISTRATION

Y|N
Only during ‘Modify’

NUMERICID|MOBILE

7.1

Details of device from
which the transaction
was initiated

7.1.1

Device Tag

<Payer.Device>

1..n

Alphabetic

Fixed

M

<Payer.Device.Ta
g>

1..n

Alphabetic

Fixed

M

        Technical Specification Document                               160 | P a g e

7.1.1.1 Name of the Property

name

1..n

7.1.1.2 Value of the property

value

1..n

Fixed

Code
(MOBILE,
GEOCODE,
LOCATION,
IP, TYPE, ID,
OS, APP,
CAPABILITY,
TELECOM)
Alphanumeric Min: 1

Max: 20

7.2

7.2.1

7.3

7.3.1

7.3.2

This field indicates
Account details of the
Payer

This field indicates Type
of the alias

This field indicates
Details related to Payer
Alias

<Payer.Ac>

1..1

Alphabetic

Fixed

addrType

1..1

Code

<Payer.Ac.Detail> 1..n

Alphabetic

Min:1
Max: 20

Min:1
Max:255

This field indicates Name
of the property

This field indicates Value
of the property

name

value

1..n

1..n

Code

Fixed

Alphanumeric Min:1

Max:20

Sample API message is given below –

M

TELECOM in case of USSD.

M

M

M

M

M

M

Only one entity is allowed for a payer

046_ReqPay_Ac_addrType

048_ReqPay_Ac_name_Account

<upi:ReqRegMapper xmlns:upi=”http://npci.org/upi/schema/”>

  <Head ver=”2.0” ts=”” orgId=”” msgId=”” prodType= “UPI”/>
  <Txn id=”” note=”” refId=”” refUrl=”” ts=”” type=”CMREGISTRATION” op=”ADD|MODIFY” />
  <Payer addr=”” name=”” seqNum=”” type=”PERSON|ENTITY” code=””>
    <RegIdDetails>
      <Id name=”MOBILE|NUMERICID” value=”” setStatus="ACTIVE|INACTIVE|BLOCK|UNBLOCK|DEREGISTER"/>

        Technical Specification Document                               161 | P a g e

</RegIdDetails>
<Consent name=”CMREGISTRATION” value=”Y|N” prevVpa="" />
<Device>
<Tag name=”MOBILE” value=””/>
<Tag name=”GEOCODE” value=””/>
<Tag name=”LOCATION” value=”” />
<Tag name=”IP” value=””/>
<Tag name=”TYPE” value=”MOB|IVR|USDC”/>
<Tag name=”ID” value=””/>
<Tag name=”OS” value=””/>
<Tag name=”APP” value=””/>
<Tag name=”CAPABILITY” value=””/>
<Tag name=”TELECOM” value=””/>
</Device>
</Ac>
<Ac addrType="ACCOUNT">
<Detail name="IFSC" value=""/>
<Detail name="ACTYPE" value=""/>
<Detail name="ACNUM" value=""/>
</Ac>
</Payer>
</upi:ReqRegMapper>

NOTE: In case of mobile number transfer b/w old IPS participants and new IPS participants shall fire a ReqGetAdd first and fetch the old active
alias for validation by the customer followed by getting consent to update the same. The ReqRegMapper shall be fired with the alias received in
RespGetAdd in the ReqRegMapper under tag - prevVpa i.e. last updated alias

For Numeric ID, addr tag is not mandatory. For Mobile Number , addr tag is mandatory in response in which Username of the alias will be masked
and handle will not be present.

        Technical Specification Document                               162 | P a g e

4.3.14.2. RespRegMapper

Sr No Message Item

<XMLTag>

Occurrence Datatype

Length M/O /C Rules

API Name

1.1
1.1.1 API Schema namespace

<RespRegMapper>
xmlns

1..1
1..1

Header
2.1
2.1.1 Version of the API

<Head>
ver

2.1.2 Time of

request

from

the

ts

creator of the message
2.1.3 Organization id that created the

orgId

message
2.1.4 Message

identifier- used to
correlate between request and
response

msgId

2.1.5 This field denotes the Product

prodType

3.1

Type
information,
Transaction
Carried throughout the system,
visible to all parties

<Txn>

1..1
1..1

1..1

1..1

1..1

1..1

1..1

Alphanumeric Min:1

Alphabetic
Numeric

Max: 255
Fixed
Min:1
Max: 6
ISODateTime Min:1

Numeric

Max: 255
Min:1
Max: 20

Alphanumeric Min:1

Max: 35

Alphanumeric

Fixed

Alphabetic

Fixed

3.1.1 Unique

the
Identifier
transaction across all entities,
created by the originator

of

id

1..1

Alphanumeric

Length:
35

M
M

M
M

M

M

M

M

M

M

019_Head_Version

020_Head_ts

055_OrgId

021_Head_MsgId

Value to be passed: “UPI”

022_Txn_UUID

3.1.2 Description of the transaction
(which will be printed on
Passbook)

note

1..1

Alphanumeric Min:1

M

057_note

Max: 50

        Technical Specification Document                               163 | P a g e

3.1.3 Consumer reference number to
identify (like Loan number, etc.)

refId

1..1

Alphanumeric Min:1

M

Max: 35

3.1.4 URL for the transaction

refUrl

3.1.5 Transaction origination time by

ts

the creator of the message

3.1.6 Type of the Transaction

type

3.1.7 Operation to be performed by

op

the request
Response

4.1
4.1.1 Request Message identifier

<Resp>
reqMsgId

4.1.2 Result of the transaction

result

4.1.3 Error code if failed

errCode

1..1

1..1

1..1

1..1

1..1
1..1

1..1

0..1

Details of the Registration ID

5.1
5.1.1 Alias of the Payer

<Resp.RegIdDetails> 1..1
1..1
addr

5.1.2 RegDetails ID tag

5.1.3 Name

5.1.4 Value

<Resp.RegIdDetails
.Id>
name

value

1..1

1..n

1..n

Alphanumeric Min:1

Max: 35

ISODateTime Min:1

Code

Code

Alphabetic
Alphanumeric

Code

Max: 255
Min:1
Max: 20
Fixed
Length
Fixed
Length:
35
Min:1
Max: 20

Alphanumeric Min:1

Max: 20
Code
Fixed
Alphanumeric Min:1

Alphabetic

Max: 255
Fixed

Alphabetic

Fixed

Alphanumeric Min:1

Max: 100

M

M

M

M

M
M

M

C

M
M

M

M

M

058_refUrl

020_Head_ts

“CMREGISTRATION”

ADD|MODIFY

SUCCESS|FAILURE

MOBILE|NUMERICID

        Technical Specification Document                               164 | P a g e

5.1.5 Status of the ID

setStatus

1..1

Alphabetic

Min:1
Max: 35

M

ACTIVE|INACTIVE|BLO
CK|UNBLOCK|DEREGISTER

5.1.6

Expiry Time Stamp. Will be
shared during deregistration

expiryTs

0..1

ISODateTime Min: 1

C

Max: 255

In case of deregistration
request, expiryTs will be
shared in the response and
the IPS participant can refer
the same to calculate the
cooling period of
the
Merchant Id.

seconds

The string format should be:
YYYY-
,
MMDDTHH:mm:ss.sssZ
where: YYYY-MM-DD – is the
date: year- month day.
The character "T" is used as
the delimiter. HH:mm:ss:
sss – is the time: hours,
minutes,
and
milliseconds.
‘h’ 'Z' part denotes the
time
in
the format +- hh:mm HH/hh
=
two
digits of hour (00 through 23)
allowed)
(am/pm NOT
mm = two digits of minute
(00 59)
through
ss = two digits of second (00 59)
through

zone

        Technical Specification Document                               165 | P a g e

digit

(000

three

of
through

sss=
millisecond 999)
+/- hh:mm = followed by
time zone difference from
GMT
and
minutes.This is Mandatory

hours

in

Sample API message is given below –

<upi:RespRegMapper xmlns: upi=”http://npci.org/upi/schema/”>

<Head ver=”2.0” ts=”” orgId=”” msgId=”” prodType= “UPI” />
<Txn id=”” note=”” refId=”” refUrl=”” ts=”” type=”CMREGISTRATION” op=”ADD|MODIFY”/>
<Resp reqMsgId=”” result=”SUCCESS|FAILURE” errCode=”” >

<RegIdDetails addr=””> <!—VPA of customer. In case of mobile number transfer b/w IPS
participants the response shall have the final/latest VPA as per CM! -- >

<Id name=”MOBILE|NUMERICID” value=”” setStatus="

ACTIVE|INACTIVE|BLOCK|UNBLOCK|DEREGISTER " expiryTs = “” />
</RegIdDetails>
</Resp>

</upi:RespRegMapper >

4.3.15.

Get Address API

This API is majorly used to retrieve the alias linked to the Merchant id or mobile number.
The customer can use his own credentials for enquiries. IPS participant should not allow any 3rd party to fetch the different credentials. This API
is also used during onboarding to see the availability of the selected numeric id.
GetAdd is mandatory for the below scenarios

1.  Creation of Unique Number (Mobile Number /Merchant ID)
2.  Transfer of Mobile Number to different PSP

        Technical Specification Document                               166 | P a g e

This new API shall be used for checking the availability of an ID before creating a new record as well as for fetching status in case of timeout of
CREATE/MODIFY/DELETE record.

Reference Logs Get Address API

4.3.15.1. ReqGetAdd

Sr No Message Item

<XMLTag>

Occurrence Datatype

Length

M/O /C Rules

1.1
1.1.1

API Name
API Schema namespace

<ReqGetAdd>
xmlns

2.1
2.1.1

Header
Version of the API

<Head>
ver

2.1.2

Time of
creator of the message

request

from

the

ts

2.1.3 Organization id that created

orgId

the message

2.1.4 Message

2.1.5

3.1

msgId

prodType

<Txn>

identifier- used to
correlate between request and
response
This field denotes the Product
Type
Transaction
information,
Carried throughout the system,
visible to all parties
the
Identifier
transaction across all entities,
created by the originator

of

1..1
1..1

1..1
1..1

1..1

1..1

1..1

1..1

1..1

Alphanumeric Min:1

Alphabetic
Numeric

Max:255
Fixed
Min:1
Max: 6
ISODateTime Min:1

Numeric

Max:255

Min:1
Max: 20

Alphanumeric Min:1

Max: 35

Alphanumeric

Fixed

Alphabetic

Fixed

M
M

M
M

M

M

M

M

M

019_Head_Version

020_Head_ts

055_OrgId

021_Head_MsgId

Value to be passed: “UPI”

3.1.1 Unique

id

1..1

Alphanumeric Length: 35 M

022_Txn_UUID

        Technical Specification Document                               167 | P a g e

n

the
of
(which will be

3.1.2 Description
transaction
printed on Passbook)
3.1.3 Consumer reference number
to identify (like Loan number,
etc.)

note

refId

1..1

Alphanumeric Min:1

M

057_note

Max: 50

1..1

Alphanumeric Min:1

M

Max: 35

3.1.4 URL for the transaction

refUrl

3.1.5

Transaction origination time by
the creator of the message

ts

3.1.6

Type of the Transaction

type

3.1.7

Subtype of the Transaction

subType

1..1

1..1

1..1

0..1

Alphanumeric Min:1

Max: 35

ISODateTime Min:1

Code

Alphabetic

Max: 255

Min:1
Max:20
Fixed

M

M

M

C

058_refUrl

020_Head_ts

“CHECK|FETCH|PORT”

Value will be: “VPA|ID”

This will be populated in
the
type=
“FETCH”

case

of

For
subType=”VPA”,
RegIdDetails block not
required.

subType=”ID”,
For

- Payer.addr
  RegIdDetails.value
  is
  mandatory. To fetch the
  linked full form of alias ,
  the
  to
  user has
  combination available full
  form of alias against the
  numeric id and GetAdd

try

        Technical Specification Document                               168 | P a g e

4.1

Details related to the Payer

<Payer>

4.1.1

Alias of the Payer

4.1.2 Name of the Payer

4.1.3 Unique

identifier

for each
file

inside

transaction
including payer and payee
Type of the Payer

a

4.1.4
4.1.5 Merchant Classification Code -

addr

name

seqNum

type
code

API will provide just the
status and it will reject the
invalid combination

1..1

1..1

1..1

1..1

1..1
1..1

Alphabetic

Fixed

Alphanumeric Min:1

Max:255

Alphanumeric Min:1

Numeric

Max: 99
Min:1
Max: 35

M

M

M

M

056_seqNum

Code
Numeric

Fixed
M
Length: 4 M

PERSON|ENTITY

MCC

5.1

Details of the Registration ID

<Payer.RegIdDetails> 0..1

Code

Fixed

C

5.1.1

RegDetails ID tag

5.1.2 Name
Value
5.1.3

<Payer.RegIdDetails
.Id>
name
value

1..1

1..n
1..n

Alphabetic

Fixed

Fixed
Alphabetic
Alphanumeric Min:1

Max:100

M

M
M

6.1

Consent

<Payer.Consent>

1..n

Alphabetic

Fixed

M

        Technical Specification Document                               169 | P a g e

In case of type=”FETCH”
and subtype =” VPA” , this
RegIdDetails block will
not be present.

MOBILE
This field will have mobile
number
whom
for
registration is supposed
to be checked.

Alphanumeric Min:1

M

CMREGISTRATION

6.1.1 Name

name

6.1.2
7.1

Value
Details of device from which
the transaction was initiated

value
<Payer.Device>

1..1

1..1
1..n

Code
Alphabetic

Max: 50
Fixed
Fixed

7.1.1

Device Tag

<Payer.Device.Tag>

1..n

Alphabetic

Fixed

7.1.1.1 Name of the Property

name

1..n

7.1.1.2 Value of the property

value

1..n

Sample API message is given below –

Fixed

Code (MOBILE,
GEOCODE,
LOCATION, IP,
TYPE, ID, OS,
APP,
CAPABILITY,
TELECOM)
Alphanumeric Min:1

Max: 20

M
M

M

M

M

<upi:ReqGetAdd xmlns:upi="http://npci.org/upi/schema/">
<Head ver="2.0" ts="" orgId="" msgId="" prodType="UPI"/>
<Txn id="" note="" refId="" refUrl="" ts="" type="CHECK|FETCH|PORT" subType=”ID|VPA”/>

<!—For subType=”VPA”, RegIdDetails block not required
For subType=”ID” , Payer.addr + RegIdDetails.value is mandatory -->

    <Payer addr="" name="" seqNum="" type="PERSON|ENTITY" code="">
         <RegIdDetails>
              <Id name="MOBILE" value=""/>
              <Id name="NUMERICID" value=""/>
         </RegIdDetails>
         <Consent name="CMREGISTRATION" value="Y|N"/>
         <Device>
               <Tag name="MOBILE" value=""/>

        Technical Specification Document                               170 | P a g e

<Tag name="GEOCODE" value=""/>
<Tag name="LOCATION" value="" />
<Tag name="IP" value=""/>
<Tag name="TYPE" value="MOB|IVR|USDC"/>
<Tag name="ID" value=""/>
<Tag name="OS" value=""/>
<Tag name="APP" value=""/>
<Tag name="CAPABILITY" value=""/>
<Tag name="TELECOM" value=""/>
</Device>
</Payer>
</upi: ReqGetAdd>

4.3.15.2. RespGetAdd

Sr No Message Item

<XMLTag>

Occurrence Datatype

Length

M/O /C Rules

API Name

1.1
1.1.1 API Schema namespace

<RespGetAdd>
xmlns

2.1
Header
2.1.1 Version of the API

<Head>
ver

2.1.2 Time of request from the creator of

ts

the message

2.1.3 Organization id that created the

orgId

message

2.1.4 Message identifier- used to

msgId

correlate between request and
response

1..1
1..1

1..1
1..1

1..1

1..1

1..1

Alphanumeric Min: 1

Alphabetic
Numeric

Max: 255
Fixed
Min: 1
Max: 6
ISODateTime Min: 1

Numeric

Max:255

Min: 1
Max: 20

Alphanumeric Min: 1

Max: 35

M
M

M
M

M

M

M

019_Head_Version

020_Head_ts

055_OrgId

021_Head_MsgId

        Technical Specification Document                               171 | P a g e

2.1.5 This field denotes the Product Type prodType

3.1

Transaction information, Carried
throughout the system, visible to
all parties

<Txn>

1..1

1..1

Alphanumeric Fixed

Alphabetic

Fixed

M

M

Value to be passed:
“UPI”

3.1.1 Unique Identifier of the transaction

id

1..1

Alphanumeric Length: 35 M

022_Txn_UUID

across all entities, created by the
originator

3.1.2 Description of the transaction

note

1..1

Alphanumeric Min: 1

M

057_note

(which will be printed on
Passbook)

3.1.3 Consumer reference number to
identify (like Loan number, etc.)

refId

1..1

Alphanumeric Min: 1

Max: 50

3.1.4 URL for the transaction

refUrl

3.1.5 Transaction origination time by the

ts

creator of the message

3.1.6 Type of the Transaction

type

Response

4.1
4.1.1 Request Message identifier

<Resp>
reqMsgId

4.1.2 Result of the transaction

result

4.1.3 Error code if failed

errCode

1..1

1..1

1..1

1..1
1..1

1..1

0..1

Max: 35

Alphanumeric Min: 1

Max: 35

ISODateTime Min: 1

Max: 255

Code

Min: 1
Max: 20
Fixed

Alphabetic
M
Alphanumeric Length: 35 M

M

M

M

M

058_refUrl

020_Head_ts

“CHECK|FETCH|PORT
”

Code

Min: 1
Max: 20

Alphanumeric Min: 1

Max: 20

M

C

“SUCCESS|FAI LURE”

027_Response_ErrCod
e

        Technical Specification Document                               172 | P a g e

5.1

Details of the Registration ID

5.1.1 Alias of the Payer

5.1.2 Type of the Payer
5.1.3 Status of the Id

<Resp.RegIdDetails

> addr

type
idStatus

1..1

1..1

1..1
1..1

Code

Fixed

Alphanumeric Min: 1

Code
Code

Max:255
Fixed
Fixed

M

M

M
M

5.1.4 Last Modified date of the account

lastUpdatedTs

0..1

ISODateTime Min: 1

C

provider information in the IPS
system

Max: 255

        Technical Specification Document                               173 | P a g e

“PERSON|ENTITY”
NEW|ÄCTIVE|INACTIVE
|BLOCK|UNBLOCK|DE
REGISTER

Populate this field
when type=”FETCH”
or “PORT”

The string format
should be: YYYY-
MMDDTHH:mm:ss.sss
Z ,
where: YYYY-MM-DD –
is the date: year-
monthday. The
character "T" is used
as the delimiter.
HH:mm:ss:sss – is the
time: hours, minutes,
seconds and
milliseconds.
‘h’ 'Z' part denotes the
time zone in the format
+- h:mm HH/hh = two
digits of hour (00
through 23) (am/pm

NOT allowed)
mm = two digits of
minute (00 through 59)
ss= two digits of
second (00 through 59)
sss= three digit of
millisecond (000
through 999)
+/- hh:mm = followed
by time zone
difference from GMT in
hours and
minutes. This is
Mandatory
MOB|USDC

Populate this field
when type=”FETCH” or
“PORT”

“MOBILE|NUMERICID”

056_seqNum

5.1.5

Initiating Channel

channel

0..1

Alphabetic

Fixed

C

5.1.6 RegDetails ID tag

5.1.7 Name

5.1.8 Value

5.1.9 Unique identifier for each

seqNum

transaction inside a file including
payer and payee

Sample API message is given below –

<Resp.RegIdDetails
.Id>
name

1..1

1..n

Alphabetic

Fixed

Alphabetic

Fixed

value

1..n

0..1

Alphanumeric Min: 1

Numeric

Max:100
Min: 1
Max: 35

M

M

M

O

        Technical Specification Document                               174 | P a g e

<upi:RespGetAdd xmlns:upi="http://npci.org/upi/schema/">

   <Head ver="2.0" ts="" orgId="" msgId="" prodType="UPI" />
     <Txn id="" note="" refId="" refUrl="" ts="" type="CHECK|FETCH|PORT”/>
<Resp reqMsgId="" result="SUCCESS|FAILURE" errCode="">
<RegIdDetails addr="" type="PERSON|ENTITY" idStatus="
NEW|ACTIVE|INACTIVE|BLOCK|UNBLOCK|DEREGISTER" lastUpdatedTs="" channel="MOB|USDC" ><!—VPA of
customer  !-->

<Id name="MOBILE" value=""/>
<Id name="NUMERICID" value="" seqNum="1" />

    </RegIdDetails>

   </Resp>
</upi:RespGetAdd>

Note:
Type ‘PORT’ will while porting of mobile number from one IPS participant to Other IPS participant. The ‘result’ will be success if the number is available
and the IPS participant can initiate the ReqRegMapper API for modify request. When ‘result’ is failure user has to register the mobile number for alias
directory.

4.3.16.

ReqMapperConfirmation API

Alias Directory will send the notification of Porting of Mobile Number to old IPS participants.

Reference Logs Mapper Confirmation

4.3.16.1. ReqMapperConfirmation

Sr No Message Item

<XMLTag>

1.1

API Name

<ReqMapperConfirmation >

Occurrenc
e
1..1

Datatype

Length

M/O/C Rules

M

        Technical Specification Document                               175 | P a g e

1.1.1 API

Schema

xmlns

namespace
2.1
Header
2.1.1 Version of the API

<Head>
ver

2.1.2 Time of request from the
creator of the message

ts

2.1.3 Organization

id

that

orgId

created the message

2.1.4 Message

identifier-
used
correlate
between request and
response

to

msgId

1..1

1..1
1..1

1..1

1..1

1..1

Alphanumeric Min:1

Alphabetic
Numeric

Max: 255
Fixed
Min:1
Max: 6
ISODateTime Min:1

Numeric

Max: 255

Min:1
Max: 20

Alphanumeric Min:1

Max: 35

M

M
M

M

M

M

019_Head_Version

020_Head_ts

055_OrgId

021_Head_MsgId

2.1.5

This field denotes the
Product Type

prodType

1..1

Alphanumeric Fixed

M

to be passed:

Value
“UPI”

3.1

Transaction
information,
Carried
throughout the system,
visible to all parties

<Txn>

1..1

Alphabetic

Fixed

M

3.1.1 Unique Identifier of the
transaction across all
entities, created by the
originator

3.1.2 Transaction origination
time by the creator of
the message

id

ts

1..1

Alphanumeric Length: 35 M

022_Txn_UUID

1..1

ISODateTime Min:1

M

020_Head_ts

Max:255

        Technical Specification Document                               176 | P a g e

3.1.3 Type of the Transaction

type

3.1.4 Consumer

reference
number to identify (like
Loan number, etc.)

refId

3.1.5 URL for the transaction

refUrl

3.1.6 Description

of

the
transaction (which will
be printed on Passbook)

note

1..1

1..1

1..1

1..1

Code

Fixed
Length

Alphanumeric Min:1

Max: 35

Alphanumeric Min:1

Max: 35

Alphanumeric Min:1

Max: 50

M

M

M

M

ReqMapperConfirmatio
n

058_refUrl

057_note

3.1.7 Original Transaction Id.
(Txn Id of GetAddress
API)

3.1.8 Customer

reference
number for the initiated
transaction

orgTxnId

1..1

Alphabetic

Fixed

M

custRef

1..1

Numeric

Length=12 M

1..1

1..1

1..n
1..1

1..1

Alphabetic

Fixed

Code

Alphabetic
Code

Numeric

Fixed
Length

Fixed
Min:1
Max: 20
Min:1
Max: 35

M

M

M
M

M

This is the unique value
the
generated
participant
the
transaction.

by
for

MODIFY

MOBILE|NUMERICID

056_seqNum

4.1

Transaction
Confirmation

4.1.1 Operation
performed
request

<TxnConfirmation>

to
by

be
the

op

4.1.2 Type of Identification
4.1.3 Original
status
5.1.3 Unique

identifier

transaction

idType
orgStatus

seqNum

for
each transaction inside
a file
including payer
and payee
Response Reference

5.1

<TxnConfirmation.Refs>

1..n

Alphabetic

Fixed

M

        Technical Specification Document                               177 | P a g e

Ref type
5.1
5.1.1 Alias of the Payer

type
addr

5.1.2 Name of the Payer

name

5.1.3 Merchant Classification

code

Code - MCC
IPS Number of the alias cmId

5.1.4

5.1.5

Status of the cmId

status

Initiating Channel
Consent

5.1.6
5.2
5.2.1 Name

channel
<TxnConfirmation.Consent>
name

5.2.2 Value

value

5.2.3

Previous VPA

prevVpa

1..1
1..1

1..1

1..1

1..1

1..1

1..1
1..1
1..1

1..1

1..1

Code
Alphanumeric Min:1

Max: 255

Alphanumeric Min:1

Numeric

Numeric

Code

Max: 99
Length: 4

Min:6
Max: 16
Fixed

Alphabetic
Alphabetic
Alphanumeric Min:

Fixed
Fixed

1

Code

Code

Max: 50
Fixed

Min:
Max: 9

6

C

M
M

M

O

M

M

M
M
M

M

“ACTIVE|INACTIVE|NEW
|DEREGISTER|BLOCK|U
NBLOCK“
MOB|USDC

CMREGISTRATION

Y|N
This will be always “Y’
Only during op=‘Modify’.
This field will contain the
previously mapped full
alias to short alias.

Sample API message is given below –

<upi:ReqMapperConfirmation xmlns:upi="http://npci.org/upi/schema/">
<Head ver="2.0" ts="" orgId="" msgId="" prodType=“UPI”/>

 <Txn id="" note="" custRef="" refId="" refUrl="" ts="" type="CMREGISTRATION" orgTxnId=""/>
 <TxnConfirmation orgStatus="SUCCESS|FAILURE" op="ADD|MODIFY" idType="MOBILE|NUMERICID">

<Refs type="PAYER" addr="" cmId="" code="" channel=”MOB|IVR” status=”DEREGISTER”/>

        Technical Specification Document                               178 | P a g e

<Consent name="CMREGISTRATION" value="" prevVpa=""/>

</TxnConfirmation>
</upi:ReqMapperConfirmation>

4.3.16.2. RespMapperConfirmation

Sr No Message Item

<XMLTag>

Occurrence Datatype

Length

M/O /C

Rules

1.1

API Name

<RespMapperConfirmation>

1..1

1.1.1 API

Schema

xmlns

namespace
2.1
Header
2.1.1 Version of the API

<Head>
ver

2.1.2 Time of request from
the

the creator of
message

ts

2.1.3 Organization id that
created the message

orgId

1..1

1..1
1..1

1..1

Alphanumeric Min: 1

Alphabetic
Numeric

Max: 255
Fixed
Min: 1
Max: 6
ISODateTime Min: 1

1..1

Numeric

Max: 255

Min: 1
Max: 20

M

M

M
M

M

M

019_Head_Version

020_Head_ts

055_OrgId

2.1.4 Message

identifier-
used
to correlate
between request and
response

msgId

1..1

Alphanumeric Min: 1

M

021_Head_MsgId

Max: 35

3.1

This field denotes the
Product Type

prodType

1..1

Alphanumeric Fixed

M

Value to be passed:
“UPI”

        Technical Specification Document                               179 | P a g e

3.1.1 Transaction

<Txn>

1..1

Alphabetic

Fixed

M

information, Carried
throughout
the
system, visible to all
parties
3.1.2 Unique

Identifier of
the
transaction
across all entities,
created
the
originator

by

id

1..1

Alphanumeric Length: 35 M

022_Txn_UUID

3.1.3 Transaction

ts

1..1

ISODateTime Min: 1

M

020_Head_ts

origination
the creator of
message

time by
the

the

3.1.4 Type

of
Transaction
3.1.5 Consumer reference
number
identify
to
(like Loan number,
etc.)

3.1.6 URL

the

for
transaction
Description of
the
(which
transaction
will be printed on
Passbook)

type

refId

refUrl

note

Max: 255

Code

Fixed

Alphanumeric Min: 1

Max: 35

Alphanumeric Min: 1

Max: 35

Alphanumeric Min: 1

Max: 50

M

M

M

M

1..1

1..1

1..1

1..1

ReqMapperConfirmation

058_refUrl

057_note

3.1.7 Original Transaction
(Txn Id of Get

Id.
Address API)

orgTxnId

1..1

Alphabetic

Fixed

M

        Technical Specification Document                               180 | P a g e

3.1.8 Customer reference
number
the
initiated transaction

for

custRef

1..1

Numeric

Length=12 M

Response

4.1
4.1.1 Request
identifier

Message

<Resp>
reqMsgId

4.1.2 Result

of

the

result

transaction
4.1.3 Error code if failed

errCode

Sample API message is given below –

1..1
1..1

1..1

0..1

M
Alphabetic
Alphanumeric Length: 35 M

Fixed

Code

Min: 1
Max: 20

Alphanumeric Min: 1

Max: 20

M

C

This is the unique value
generated by the
participant for the
transaction.

027_Response_ErrCode

<upi:RespMapperConfirmation xmlns:upi="http://npci.org/upi/schema/">

<Head ver="2.0" ts="" orgId="" msgId="" prodType=“UPI”/>
<Txn id="" custRef="" note="" refId="" refUrl="" ts="" type="ReqMapperConfirmation" orgTxnId="" />
<Resp reqMsgId="" result="SUCCESS|FAILURE" errCode=""/>

</upi:RespMapperConfirmation>

Note: orgStatus should be success in case of Transfer of mobile number between IPS participant.

        Technical Specification Document                               181 | P a g e

4.4. Financial APIs

4.4.1. Pay API
Refer Reference Logs Payment Request

4.4.1.1. ReqPay

Sr No

Message Item

<XMLTag

Occurrence Datatype

Length

M/O/C Rules

1.1

1.1.1

2.1
2.1.1

2.1.2

2.1.3

2.1.4

2.1.5

3.1

API Name

API Schema namespace

Header

Version of the API

<ReqPay>

xmlns

<Head>

ver

Time of request from the creator of
the message

ts

Organization id that created the
message
Message
to
identifier-
correlate between request and
response
This field denotes the Product Type prodType

msgId

orgId

used

Meta data primarily for analytics
purpose

<Meta>

1..1

1..1

1..1

1..1

1..1

1..1

1..1

1..1

0..1

Alphanumeric

Alphabetic

Numeric

ISODateTime

Numeric

Min: 1
Max: 255

Fixed
Min: 1
Max: 6
Min: 1
Max: 255

Min: 1
Max: 20

M

M

M

M

M

M

Alphanumeric Length: 35 M

Alphanumeric Fixed

Alphabetic

Fixed

M

O

019_Head_Version

020_Head_ts

055_OrgId

021_Head_MsgId

Value to be passed:
“UPI”

        Technical Specification Document                               182 | P a g e

Meta data primarily for analytics
purposes

<Meta.Tag>

0..1

Alphabetic

Fixed

3.2

3.2.1

3.2.2

4.1

4.1.1

4.1.2

4.1.3

4.1.4

4.1.5

4.1.6

Name of the property

Value of the property

Transaction
information, Carried
throughout the system, visible to
all parties
Unique Identifier of the transaction
across all entities, created by the
originator
Description of
transaction
(which will be printed on Passbook)

the

Consumer reference number to
identify (like Loan number, etc.)

URL for the transaction

name

value

<Txn>

id

note

refId

refUrl

Transaction origination time by the
creator of the message

ts

1..n

1..n

1..1

1..1

1..1

1..1

1..1

1..1

Alphanumeric Length: 35 M

Code

ISODateTime

Min: 1
Max: 20
Min: 1
Max: 255

Alphabetic

Fixed

Alphanumeric

Alphanumeric

Min: 1
Max: 50

Min: 1
Max: 35

Alphanumeric Min: 1

ISODateTime

Max: 35
Min: 1
Max: 255

Min: 1
Max: 20

M

M

M

M

M

M

M

M

M

022_Txn_UUID

057_note

058_refUrl

020_Head_ts

001_ReqPay_Pay
002_ReqPay_Collect
003_ReqPay_Debit
004_ReqPay_Credit
005_ReqPay_DebitRevers
al
006_ReqPay_CreditRever
sal

Type of the Transaction

type

1..1

Code

4.1.7

Original
transaction
reversal/Refund has to be done

ID when

orgTxnId

0..1

Alphanumeric Length: 35 C

023_Txn_orgTxnId

        Technical Specification Document                               183 | P a g e

4.1.8

4.1.9

4.1.10

4.1.11

4.1.12

4.1.13

4.1.14

4.1.15

Customer reference number for
the initiated transaction

custRef

1..1

Numeric

Length: 12 M

Subtype of transaction

subType

0..1

Code

Initiation mode

initiationMode

1..1

Code

OrgRespCode of the transaction

orgRespCode

0..1

Alphanumeric

Purpose of the txn

purpose

1..1

Code

Min: 1
Max: 20

Min: 1
Max: 35
Min: 1
Max: 20

Fixed

C

M

C

M

Original RRN

orgRrn

0..1

Numeric

Length:12

C

Original Date of the txn

orgTxnDate

0..1

ISODateTime

Min: 1
Max: 255

Reference Category

refCategory

0..1

Code

Fixed

4.1.16

Common Library Version

clVersion

1..1

Alphanumeric Fixed

Length =15

        Technical Specification Document                               184 | P a g e

C

O

M

This is the unique value
generated by the
participant for the
transaction.
030_Txn_SubType

field

is only
subType
for
applicable
ReqPay_debit/credit/reve
rsal

031_Txn_Initiation mode

039_ReqPay_OrgRespCo
de
045_ReqPay_Txn_purpos
e

This field will be
mandatory in case of
type=”REVERSAL”
This field will be
mandatory in case of
type=”REVERSAL”
052_ReqPay_Txn_refCate
gory

The clVersion field will
follow an alphanumeric
format with validation
structured as: clVersion-
subVersion-
expiryOfPublicKey

4.2

4.3

4.3.1

4.3.2

4.3.3

4.4

4.5

4.5.1

4.5.2

Score

Risk
to
transaction and the entities

related

Score

Risk
to
transaction and the entities

related

the

the

<Txn.RiskScore
s>

<Txn.RiskScore
s .Score>

Entity providing the risk score

provider

Type of risk

Value of risk evaluation ranging
from 0 (No Risk) to 100(Maximum
Risk)

type

value

0..1

1..n

1..1

1..1

1..1

Alphabetic

Fixed

Alphabetic

Fixed

Code

Code

Integer

Min: 1
Max: 20
Min: 1
Max: 99

Min: 1
Max: 50

Rules that govern the payment

<Txn.Rules>

0..1

Alphabetic

Fixed

Rule for the transaction

Name of the property

Value of the property

4.6

Qr Block

<Txn.Rules.Rul
e>

name

value

<Txn.Qr>

1..n

1..n

1..n

0..1

Alphabetic

Fixed

Code

Alphanumeric

Alphabetic

Min: 1
Max: 20
Min: 1
Max: 255

        Technical Specification Document                               185 | P a g e

Each component is
separated by a hyphen (‘-
’). A sample value along
with a detailed
explanation has been
included in the Common
Library document for
clarity.

This field is mandatory in
case of type=”COLLECT”

This is for the future
scope

O

M

M

M

M

C

M

M

M

O

4.6.1

4.6.2

4.6.3

4.6.4

4.6.5

4.6.6

4.6.7

5.1
5.1.1

5.1.2

This field indicates the version of
IPS QR being used.
This field indicates QR generation
timestamp
This field indicates the QR medium
tag denotes Source channel i.e.
creation point of the QR.
This field indicates QR Expiry date
& time Mapped to ‘QRexpire’
parameter in QR string.
This field indicates Query

This field indicates Verification
token for QR request. This will be
passed in the financial request
Reference to International partner
for ValQr and Financial request
generated by the International
Partner
This field indicates
STAN present in QR It denotes the
value generated and passed by the
acquiring
internal
reconciliation
Details related to the Payer

bank

for

Alias of the Payer

Name of the Payer

qVer

ts

1..1

0..1

Numeric

Min :1
Max : 6

ISODateTime Min :1

qrMedium

0..1

Numeric

Max : 255
Min :1
Max :99

M

O

O

ExpireTs

0..1

ISODateTime Min :1

O

query

verToken

0..1

JSON

String

Max :255

O

O

Min :1
Max :80

stan

0..1

String

6

O

<Payer>

addr

name

1..1

1..1

1..1

Alphabetic

Alphanumeric

Alphanumeric

Fixed
Min: 1
Max: 255
Min: 1
Max: 99

M

M

M

        Technical Specification Document                               186 | P a g e

identifier

each
Unique
transaction inside a file including
payer and payee

for

seqNum

Type of the Payer
Merchant Classification Code –
MCC

type

code

1..1

1..1

1..1

Numeric

Min: 1
Max: 35

Code

Fixed

Numeric

Length: 4

Alias Directory Id/ numeric Id/cmId cmId

0.1

Alphanumeric

Min:6
Max:25

M

M

M

C

5.1.3

5.1.4
5.1.5

5.1.6

5.2

Merchant block

5.2.1

5.2.1.1
5.2.1.2

5.2.1.3

5.2.1.4

Identifier

Subcode

Merchant Identifier

Store id

Terminal Identifier

5.2.1.5 Merchant type
5.2.1.6

Merchant Genre

5.2.1.7

Merchant onboarding Type

<Payer.Mercha
nt>

<Payer.Mercha
nt.Identifier>
subCode

mid

sid

tid

merchantType
merchantGenr
e
onBoardingTyp
e

0..1

Alphabetic

Fixed

C

1..1

0..1

1..1

0..1

0..1

0..1

0..1

0..1

Alphabetic

Fixed

Code

Alphanumeric

Alphanumeric

Alphanumeric

Alphabetic

Length:4
Min: 1
Max: 20
Min: 1
Max: 20
Min: 1
Max: 20
Fixed

Alphabetic

Fixed

Alphabetic

Fixed

M

O

M

O

O

O

O

O

        Technical Specification Document                               187 | P a g e

056_seqNum

029_Payer/Payee_Type

024_Txn_code

Mandatory In case of
transaction being done
using Mobile
Number/Merchant ID
else optional
037_ReqPay_Payer/Paye
e_MerchantTag .

For type=”REFUND”, this
tag is mandatory

SMALL|LARGE

ONLINE|OFFLINE

5.2.1.8

5.2.1.9

This field indicates the Registration
Id
This
pincode

the Area

indicates

field

5.2.1.10 This field indicates the tier of the

5.2.2

5.2.2.1

5.2.2.2

5.2.2.3

5.2.3

city

Name

Brand

Legal

Franchise

Ownership

5.2.3.1

Type

5.2.4

5.2.4.1

5.2.4.2

5.2.4.3

This field
details.

This field
name
This field
Number.
This field
Date.

6.1

Institution

regIdNo

pinCode

tier

<Payer.Mercha
nt.Name>

brand

legal

franchise

<Payer.Mercha
nt.Ownership>

type

<Payer.Mercha
nt.Invoice>

0..1

0..1

0..1

0..1

1..1

0..1

0..1

0..1

1..1

0..1

1..1

1..1

1..1

Alphanumeric Max:35

Numeric

Fixed

Alphanumeric Code

Alphabetic

Alphanumeric

Alphanumeric

Alphanumeric

Min: 1
Max: 99
Min: 1
Max: 99
Min: 1
Max: 99
Min: 1
Max: 99

Alphabetic

Fixed

Code

Fixed

Alphabetic

Fixed

Alphanumeric

Min:1
Max:99

Alphanumeric Max:20

ISODateTime

Min:1
Max: 255

O

O

O

O

M

O

O

O

M

O

M

M

M

O

038_ReqPay_MerchantTa
g_Ownership_Type

053_Payee.Merchant.Inv
oice_num
054_Payee.Merchant.Inv
oice_date
042_ReqPay_Initiationmo
de
This is for future use.

<Payer.Instituti
on>

1..n

Alphabetic

Fixed

        Technical Specification Document                               188 | P a g e

indicates the

invoice

indicates the

invoice

indicates the

Invoice

indicates the

Invoice

name

num

date

043_ReqPay_Institution_t
ype
044_ReqPay_Institution_r
oute

6.1.1

Type

6.1.2

Route

6.2

Name

6.2.1

Value

6.2.2

acNum

6.3

Purpose

6.3.1

Code

6.3.2

Note

6.4

Originator

6.4.1

Name

6.4.2

Type

6.4.3

refNo

6.4.4

Address

6.4.4.1

Location

6.4.4.2

City

6.4.4.3

Country

type

route

<Payer.Instituti
on.Name>

value

acNum

<Payer.Instituti
on.purpose>

code

note

<Payer.Instituti
on.Originator>

name

type

refNo

<Payer.Instituti
on.Originator
.Address>

location

city

country

1..1

1..1

1..1

1..1

1..1

1..1

1..1

1..1

1..1

1..1

1..1

1..1

1..1

1..1

1..1

1..1

Code

Code

Fixed

Fixed

Alphabetic

Fixed

Alphanumeric

Alphanumeric

Min: 1
Max: 100
Min: 1
Max: 30

Alphabetic

Fixed

Code

Alphanumeric

Min: 1
Max: 50
Min: 1
Max: 50

Alphabetic

Fixed

Alphanumeric

Code

Alphanumeric

Min: 1
Max: 50
Fixed
Min: 1
Max: 30

Alphabetic

Fixed

Alphanumeric

Alphanumeric

Min: 1
Max: 40
Min: 1
Max: 100

Alphanumeric Min: 1

M

M

M

M

M

M

M

M

M

M

M

M

M

M

M

M

        Technical Specification Document                               189 | P a g e

6.4.4.4

Geocode

6.5

Beneficiary

6.5.1

Name

geocode

<Payer.Instituti
on.Beneficiary>

name

1..1

1..1

1..1

Alphanumeric

Max: 100
nn.nn
nn,nn.nnnn

Alphabetic

Fixed

Alphabetic

Min: 1
Max : 50

M

M

M

7.1

Information related to the Payer

<Payer.Info>

0..1

Alphabetic

Fixed

C

7.1.1

Payer Identity Is mandatory for
“pay” and optional for “collect”

<Payer.Info.Ide
ntity>

7.1.1.1

Id of the identifier

7.1.1.2

Type of the identifier

id

type

1..1

1..1

1..1

Alphabetic

Alphanumeric

Code

7.1.1.3

Name as per the identifier

verifiedName

1..1

Alphanumeric

Min: 1
Max: 20
Min: 1
Max: 99
Fixed
Min: 1
Max: 99

7.2

Rating of the payer

7.2.1

verifiedAddress

<Payer.Info.Rat
ing>

verified
Address

0..1

1..1

Alphabetic

Fixed

Code

Boolean
TRUE/FALS
E

M

M

M

M

O

M

8.1

Details of device from which the
transaction was initiated

<Payer.Device> 0..1

Alphabetic

Fixed

C

        Technical Specification Document                               190 | P a g e

001_ReqPay_Pay
002_ReqPay_Collect
003_ReqPay_Debit
004_ReqPay_Credit
005_ReqPay_DebitRevers
al
006_ReqPay_CreditRever
sal

026_Payer/Payee_InfoRat
ing

001_ReqPay_Pay
002_ReqPay_Collect
003_ReqPay_Debit
004_ReqPay_Credit

8.1.1

Device Tag

<Payer.Device.
Tag>

1..n

Alphabetic

Fixed

M

8.1.1.1

Name of the property

name

1..n

Code
(MOBILE,
GEOCODE,
LOCATION,
IP, TYPE, ID,
OS, APP,
CAPABILITY,
TELECOM )

8.1.1.2

Value of the property

value

1..n

Alphanumeric

Fixed

M

Min: 1
Max: 20

M

9.1

Only one entity is allowed for a
payer

<Payer.Ac>

0..1

Alphabetic

Fixed

C

9.1.1

Type of the Alias

addrType

1..1

Code

Min: 1
Max: 20

M

        Technical Specification Document                               191 | P a g e

005_ReqPay_DebitRevers
al
006_ReqPay_CreditRever
sal

034_ReqPay_DeviceDetai
ls_Values
035_ReqPay_DeviceDetai
ls_type
036_ReqPay_DeviceDetai
ls_OS

001*ReqPay_Pay
002_ReqPay_Collect
003_ReqPay_Debit
004_ReqPay_Credit
005_ReqPay_DebitRevers
al
006_ReqPay_CreditRever
sal
046_ReqPay*
Ac_addrType

9.1.2

Details related to Payer Alias

< Payer.Ac
.Detail>

1..n

Alphabetic

Min: 1
Max: 255

M

9.1.3

Name of the property

name

1..n

Code

Fixed

M

9.1.4

Value of the property

value

1..n

Alphanumeric

10.1

Information
Credentials

related

to Payer

<Payer.Creds>

1..1

Alphabetic

10.1.1

Credentials are used to authentic
ate the request

<Payer.Creds
.Cred>

1..n

Alphabetic

Min: 1
Max: 20
Min: 1
Max: 20

Min: 1
Max: 20

10.1.1.1

Type of financial instrument used
for authentication

type

10.1.1.2 Subtype

10.1.2

base-64
authentication data

encoded/

encrypted

10.1.2.1 Data Code

10.1.2.2 Key Index

subType

< Payer.Creds
.Cred.Data>

code

ki

11.1

Information related to the amounts
in the transaction

<Payer.Amount

>

1..1

1..1

1..1

1..1

1..1

0..1

Code

Code

Fixed

Fixed

Alphabetic

Fixed

Code
Alphanumeric

Fixed

Fixed

Alphabetic

Fixed

        Technical Specification Document                               192 | P a g e

M

M

M

M

M

M

M

M

C

048*ReqPay*
Ac*name_Account
049_ReqPay*
Ac_name_Mobile
050_ReqPay_Ac_name_C
ard

040_ReqPay_Credblock
041_RespAuthDetailUPI
mandate_CollectCredblo
ck
007_ReqPay_PreApprove
d
025_Response_Approval
Num

040_ReqPay_Credblock

001_ReqPay_Pay
002_ReqPay_Collect

11.1.1

Transaction amount

value

1..1

Numeric

11.1.2

Currency of the transaction

curr

11.1.3

Details of transaction amount

11.1.3.1 Name of the property

11.1.3.2 Value of the property

<Payer.Amount
.Split>

name

value

12.1
12.1.1

Details related to the Payees
Details related to the Payees

<Payees>
<Payee>

12.1.1.1 Alias of the Payee

12.1.1.2 Name of the Payee

12.1.1.3

identifier

Unique
each
transaction inside a file including
Payee and payee

for

addr

name

seqNum

12.1.1.4 Type of the Payee

type

1..1

0..1

1..n

1..n

1..1
1..1

1..1

1..1

1..1

1..1

003_ReqPay_Debit
004_ReqPay_Credit
005_ReqPay_DebitRevers
al
006_ReqPay_CreditRever
sal

051_ReqPay_Amount_Val
ue

This is for future Use

CASHBACK|PUCHASE

056_seqNum

029_Payer/Payee_Type

M

M

O

M

M

M
M

M

M

M

M

min
Inclusive: 0
Total
Digits: 15
Min: 1
Max: 3

Text

Alphabetic

Fixed

Code

Alphanumeric

Alphabetic
Alphabetic

Alphanumeric

Alphanumeric

Numeric

Code

Min: 1
Max: 20

Min: 1
Max: 99
Fixed
Fixed

Min: 1
Max: 255

Min: 1
Max: 99

Min: 1
Max: 3

Fixed

        Technical Specification Document                               193 | P a g e

This needs to be
populated if the
transaction is done using
Mobile number/Merchant
Id
037_ReqPay_Payer/Paye
e_MerchantTag

In case of a P2M txn the
merchant tag is
mandatory

12.1.1.5 Alias Directory Id/ numeric Id/cmId cmId

0.1

Alphanumeric

Min:6
Max:25

O

13.1

13.1.1

13.1.1.1

13.1.1.2

13.1.1.3

13.1.1.4

13.1.1.5

13.1.1.6

13.1.1.7

Merchant block

<Payee.Mercha
nt>

0..1

Alphabetic

Fixed

C

Identifier

Subcode

Merchant Identifier

Store id

Terminal Identifier

<Payee.Mercha
nt.Identifier>

subCode

mid

sid

tid

1..1

0..1

1..1

0..1

0..1

Alphabetic

Fixed

Code

Length:4

Alphanumeric

Alphanumeric

Alphanumeric

Min: 1
Max: 20

Min: 1
Max: 20

Min: 1
Max: 20

Merchant type

merchantType

0..1

Alphabetic

Fixed

Merchant Genre

Merchant onboarding Type

merchantGenr
e

onBoardingTyp
e

0..1

0..1

Alphabetic

Fixed

Alphabetic

Fixed

M

O

M

O

O

O

O

O

13.1.1.8 This field indicates the Registration

Id

regIdNo

0..1

Alphanumeric Max:35

O

        Technical Specification Document                               194 | P a g e

13.1.1.9 This

field

indicates

the Area

pincode

pinCode

This field indicates the tier of the
city

tier

0..1

0..1

Numeric

Fixed

Alphanumeric Code

This fields indicates the Merchant
location

This fields indicates the Merchant
Institution Id

merchantLoc

0..1

Alphanumeric

merchantInstId 0..1

Alphanumeric

13.1.1.1
0

13.1.1.1
1

13.1.1.1
2

13.1.2

13.1.2.1

13.1.2.2

13.1.2.3

13.1.3

13.1.3.1 Type

13.1.4

13.1.4.1

13.1.4.2

13.1.4.3

This field
details.

This field
name

This field
Number.

This field
Date.

Name

Brand

Legal

Franchise

Ownership

<Payee.Mercha
nt.Name>

brand

legal

franchise

<Payee.Mercha
nt.Ownership>

type

<Payee.Mercha
nt.Invoice>

indicates the

invoice

0..1

1..1

0..1

0..1

0..1

1..1

0..1

Alphabetic

Fixed

indicates the

invoice

indicates the

Invoice

indicates the

Invoice

name

num

date

1..1

1..1

1..1

Alphanumeric

Min:1
Max:99

Alphanumeric Max:20

ISODateTime

Min:1
Max: 255

        Technical Specification Document                               195 | P a g e

Min: 1
Max: 99

Min: 1
Max: 99

Min: 1
Max: 99

Min: 1
Max: 99

Min: 1
Max: 99

Min: 1
Max: 99

Alphabetic

Alphanumeric

Alphanumeric

Alphanumeric

Alphabetic

Fixed

Code

Fixed

O

O

O

O

O

M

O

O

O

M

O

M

M

M

038_ReqPay_MerchantTa
g_Ownership_Type

053_Payee.Merchant.Inv
oice_num

054_Payee.Merchant.Inv
oice_date

15.1

Information related to the Payer

<Payee.Info>

0..1

Alphabetic

Fixed

C

15.1.1

Payee Identity

15.1.1.1 Type of the identifier

<Payee.Info.Ide
ntity>
type

1..1

1..1

Alphabetic

Fixed

Code

15.1.1.2 Name as per the identifier

verifiedName

1..1

Alphanumeric

15.1.1.3

Id of the identifier

id

15.1.2

Rating of the Payee

15.1.2.1

verified Address

<Payee.Info.Ra
ting>

verified
Address

16.1

Details of Device from which the
transaction was initiated

<Payee.Device

>

16.1.1

Device Tag

16.1.1.1 Name of the property

<Payee.Device
.Tag>
name

16.1.1.2 Value of the property

value

1..1

0..1

1..1

0..1

1..n

1..n

1..n

17.1

Only one entity is allowed for a
Payee

<Payee.Ac>

0..1

Alphabetic

Fixed

        Technical Specification Document                               196 | P a g e

002_ReqPay_Collect
003_ReqPay_Debit
004_ReqPay_Credit
005_ReqPay_DebitRevers
al
006_ReqPay_CreditRever
sal

026_Payer/Payee_InfoRat
ing

002_ReqPay_Collect
003_ReqPay_Debit
004_ReqPay_Credit

002_ReqPay_Collect
003_ReqPay_Debit
004_ReqPay_Credit

Fixed

Min: 1
Max: 99

Min: 1
Max: 99

Alphanumeric

Alphabetic

Fixed

Code

Boolean
TRUE/FALS
E

Alphabetic

Fixed

Alphabetic

Fixed

Code

Alphanumeric

Fixed
Min: 1
Max: 99

M

M

M

M

O

M

C

M

M

M

C

17.1.1

Type of the Alias

17.1.2

Details related to Payee Alias

17.1.2.1 Name of the property

17.1.2.2 Value of the property

18.1

18.1.1

18.1.2

Consent

Name

Value

addrType

<Payee.Ac
.Detail>

name

value

<Consent>

name

1..1

1..n

1..n

1..n

0..1

1..1

Code

Min: 1
Max: 20

Alphabetic

Fixed

Code

Alphanumeric

Alphabetic

Fixed
Min: 1
Max: 99
Fixed

Alphanumeric Min:1

value

1..1

Code

Max: 50

Fixed

18.1.3

Type

type

1..1

Alphabetic

Fixed

M

M

M

M

O

M

M

M

19.1

Information related to the amounts
in the transaction

<Payee.Amoun
t>

0..1

Alphabetic

Fixed

C

19.1.1

Transaction amount

value

1..1

Numeric

19.1.2

Currency of the transaction

curr

1..1

Text

Min
Inclusive: 0
Total
Digits: 15
Min: 1
Max:3

M

M

        Technical Specification Document                               197 | P a g e

006_ReqPay_CreditRever
sal

Reserved for future use

001_ReqPay_Pay
002_ReqPay_Collect
003_ReqPay_Debit
004_ReqPay_Credit
006_ReqPay_CreditRever
sal

051_ReqPay_Amount_Val
ue

19.1.3

Details of transaction amount

19.1.3.1 Name of the property

19.1.3.2 Value of the property

<Payee.Amoun
t.Split>

name

value

0..1

1..n

1..n

Alphabetic

Fixed

Code

Alphanumeric

Fixed
Min: 1
Max: 99

O

M

M

This is for future use.

ATM Cash Withdrawal :

Only for the ATM cash withdrawal functionality, ReqPay request will have two cred blocks.

1.  One Cred block will be used for PIN and
2.  Another cred block will be used for OTP.

The encryption process for OTP and Wallet-PIN during the ATM cash withdrawal transaction will be integrated within the CRED block. This
process will occur in two parts:

1.  From ATM Acquirer to IPS: The ATM Acquirer will encrypt PIN/OTP using existing Signer certificate with RSA2048 bit encryption and
    RSA/ECB/OAEPWithSHA-256AndMGF1Padding using the public key of IPS. The encrypted PIN/OTP will be sent in the CRED block of
    ReqPay (type pay) to IPS. IPS will then decrypt PIN/OTP using its own private key.

2.  From IPS to SOV participants: IPS will encrypt PIN/OTP using the HSM public key of the SOV participants and send it in the CRED block

of ReqPay type Debit. The SOV participants will decrypt the CRED using its own private key to obtain the PIN/OTP.

Below is the sample cred block present in ReqPay request for capturing OTP and PIN for ATM flow:

<Creds>

<Cred type="PIN" subType="MPIN">

<Data code="" ki=""> base-64 encoded/encrypted authentication data</Data>
</Cred>
<Cred type="OTP" subType="SMS">
<Data code="" ki=""> base-64 encoded/encrypted authentication data</Data>

        Technical Specification Document                               198 | P a g e

</Cred>
</Creds>

G2P Payment:

Refer Reference Logs G2P Transaction

1.  IFSC code and account number combination, resolved directly by IPS, is represented as account-no@ifsc-code.ifsc.npci (e.g.

123456789012@ABCD0123456.ifsc.npci)

2.  SoV provider needs to pass above in the addr field ReqPay request to IPS.
3.  ReqAuthDetails not required for G2P payments as IPS getting the Account+IFSC details in ReqPay request from SoV provider.
4.  ReqTxnConfirmation will not be sent to Payee participants from IPS in case of G2P payments.
5.  Debit/Debit reversal is outside the scope of IPS in this use case.(as there is no Debit request to IPS)
6.  In case of credit timeout , transaction will be settled in next settlement cycle.
7.  Onboarding of Payee is not required as payee Account+IFSC is used.

Sample API message is given below –

<upi:ReqPay xmlns:upi="http://npci.org/upi/schema/">

<Head ver="2.0" ts="" orgId="" msgId="" prodType= "UPI"/>
<Meta>

<Tag name="PAYREQSTART" value=""/>
<Tag name="PAYREQEND" value=""/>

</Meta>
refCategory=""
<Txn
type="PAY|COLLECT|DEBIT|CREDIT|REVERSAL|REFUND"  orgTxnId=""  purpose=""  initiationMode=""  subType=""
orgRespCode="">

custRef=""

refUrl=""

refId=""

note=""

ts=""

id=""

<RiskScores>

<Score provider="sp" type="TXNRISK" value=""/>

        Technical Specification Document                               199 | P a g e

<Score provider="npci" type="TXNRISK" value=""/>

</RiskScores>
<Rules>

<Rule name="EXPIREAFTER" value="1 minute to max 64800 minutes"/>
<Rule name="MINAMOUNT" value=""/>

</Rules>
<QR qVer="" ts="" qrMedium="" expireTs="" query="" verToken="" stan=""/>

</Txn>
<Payer addr="" name="" seqNum="" type="PERSON|ENTITY" code="" cmId="">
<Merchant>
<Identifier  subCode=""  mid=""  sid=""  tid=""  merchantType="SMALL|LARGE"  merchantGenre="OFFLINE|ONLINE"
onBoardingType="BANK|AGGREGATOR|NETWORK|TPAP" pinCode="" regIdNo="" tier="" merchantLoc="" merchantInstId=""
/>
<Ownership type="PROPRIETARY|PARTNERSHIP|PRIVATE|PUBLIC|OTHERS"/>
<Invoice name="" num="" date="" />
</Merchant>

<Institution type="MTO|BANK" route="MTSS|RDA">

<Name value="" acNum=""/>
<Purpose code="" note=""/>
<Originator name="" type="INDIVIDUAL|COMPANY" refNo="">

<Address location="" city="" country="" geocode=""/>

</Originator>
<Beneficiary name=""/>

</Institution>
<Info>

<Identity id="" type="ACCOUNT" verifiedName="" />
<Rating VerifiedAddress="TRUE|FALSE"/>

</Info>
<Device>

<Tag name="MOBILE" value=""/>

        Technical Specification Document                               200 | P a g e

<Tag name="GEOCODE" value=""/>
<Tag name="LOCATION" value="" />
<Tag name="IP" value=""/>
<Tag name="TYPE" value=""/>
<Tag name="ID" value=""/>
<Tag name="OS" value=""/>
<Tag name="APP" value=""/>
<Tag name="CAPABILITY" value=""/>
<Tag name="TELECOM" value=""/>

</Device>
<Ac addrType ="ACCOUNT">

<Detail name="IFSC" value=""/>
<Detail name="ACTYPE" value=""/>
<Detail name="ACNUM" value=""/>

</Ac>
<Creds>

<Cred type="PIN" subType="MPIN">

<Data code="" ki=""> base-64 encoded/encrypted authentication data</Data>
</Cred>
<Cred type="PREAPPROVED" subType="NA">

<Data> base-64 encoded</Data>

</Cred>
</Creds>
<Amount value="" curr="NAD">

<Split name="" value=""/>

</Amount>
</Payer>
<Payees>

<Payee addr="" name="" seqNum="" type="PERSON|ENTITY" code="" cmId="">

<Merchant>

        Technical Specification Document                               201 | P a g e

<Identifier  subCode=""  mid=""  sid=""  tid=""  merchantType="SMALL|LARGE"  merchantGenre="OFFLINE|ONLINE"
onBoardingType="BANK|AGGREGATOR|NETWORK|TPAP" pinCode="" regIdNo="" tier=""/>
<Ownership type="PROPRIETARY|PARTNERSHIP|PRIVATE|PUBLIC|OTHERS"/>
<Invoice name="" num="" date="" />

</Merchant>
<Info>

<Identity id="" type="ACCOUNT" verifiedName=""/>
<Rating VerifiedAddress="TRUE|FALSE"/>

</Info>
<Device>

<Tag name="MOBILE" value=""/>
<Tag name="GEOCODE" value=""/>
<Tag name="LOCATION" value="" />
<Tag name="IP" value=""/>
<Tag name="TYPE" value=""/>
<Tag name="ID" value=""/>
<Tag name="OS" value=""/>
<Tag name="APP" value=""/>
<Tag name="CAPABILITY" value=""/>
<Tag name="TELECOM" value=""/>

</Device>
<Ac addrType="ACCOUNT">

<Detail name="IFSC" value=""/>
<Detail name="ACTYPE" value=""/>
<Detail name="ACNUM" value=""/>

</Ac>
<Amount value="" curr="NAD">

<Split name="" value=""/>

</Amount>

</Payee>

        Technical Specification Document                               202 | P a g e

</Payees>
</upi:ReqPay>

4.4.1.2. RespPay

Sr No Message Item

<XML Tag>

Occurrence Datatype

Length

M/O/C Rules

1.1
1.1.1

API Name
API Schema namespace

<RespPay>
xmlns

2.1
2.1.1

Header for the message
Version of the API

<Head>
ver

2.1.2

2.1.3

Time of
creator of the message

request

from

the

ts

Organization id that created
the message

orgId

2.1.4 Message

identifier-used

to
correlate between request and
response

msgId

1..1
1..1

1..1
1..1

1..1

1..1

1..1

Alphanumeric Min:1

Alphabetic
Numeric

Max:255

Fixed
Min:1
Max: 6

ISODateTime Min:1

Numeric

Max: 255

Min:1
Max: 20

M
M

M
M

M

M

019_Head_Version

020_Head_ts

055_OrgId

Alphanumeric Length= 35 M

021_Head_MsgId

2.1.5

3.1

3.1.1

This field denotes the Product
Type
Transaction
Carried
system, visible to all parties

information,
the

throughout

prodType

1..1

Alphanumeric Fixed

<Txn>

1..1

Alphabetic

Fixed

M

M

Value to be passed: “UPI”

Unique
transaction
entities
originator

Identifier

of

across

created

by

id

the
all
the

1..1

Alphanumeric Length= 35 M

022_Txn_UUID

        Technical Specification Document                               203 | P a g e

3.1.2

3.1.3

Description of the transaction
(which will be printed on
Passbook)

Consumer reference number
to identify (like Loan number,
etc.)

3.1.4

URL for the transaction

refurl

3.1.5

Transaction origination time by
the creator of the message

ts

note

1..1

Alphanumeric Min:1

M

057_note

Max :50

refId

1..1

Alphanumeric Min: 1

Max: 35

1..1

1..1

Alphanumeric Min: 1

Max: 35

ISODateTime Min:1

M

M

M

M

058_refUrl

020_Head_ts

Max :255

Min:1
Max: 20

3.1.6

Type of the Transaction

type

1..1

Code

3.1.7

Original transaction ID when
reversal/ Refund must be done

orgTxnId

0..1

Alphanumeric Length= 35

C

023*Txn* orgTxnId

3.1.8

Subtype of transaction

subType

0..1

Code

3.1.9

Initiation mode

initiationMode

1..1

Code

Min:1
Max: 20

Min: 1
Max: 3

3.1.10 Customer Reference number

custRef

1..1

Alphanumeric Max:12

3.1.11

Purpose of the txn

Purpose

3.1.12 Original RRN

orgRrn

1..1

0..1

Code

Fixed

Numeric

Length:12

030_Txn_SubType PAY

031_Txn_Initiationmode

This is the unique value
generated by the participant
for the transaction.
045_ReqPay_Txn_purpose

C

M

M

M

C

        Technical Specification Document                               204 | P a g e

This field is mandatory to be
populated in case of
REVERSAL
This field is mandatory to be
populated in case of
REVERSAL
052_ReqPay_Txn_refCategor
y

C

O

O

M

M

M

M

3.1.13 Original Date of the txn

orgTxnDate

0..1

ISODateTime Min: 1

Max: 255

3.1.14 Reference Category

refCategory

0..1

Code

Fixed

3.2

3.2.1

Risk Score
transaction and the entities

related

to

the

Risk Score
transaction and the entities

related

to

the

<Txn.RiskScore
s>

<Txn.RiskScore
s.Score>

3.2.1.1 Entity providing the risk score

provider

3.2.1.2 Type of risk

3.2.1.3 Value of risk evaluation ranging
to

Risk)

(No

from
0
100(Maximum Risk)

type

value

4.1
4.1.1

Response tag
Request Message identifier

<Resp>
reqMsgId

4.1.2

Result of the transaction

result

0..1

1..n

1..1

1..1

1..1

1..1
1..1

1..1

Alphabetic

Fixed

Alphabetic

Fixed

Code

Code

Integer

Min: 1
Max: 20

Min: 1
Max: 99

Min: 1
Max: 50

M
Alphabetic
Alphanumeric Length= 35 M

Fixed

Code

4.1.3

Error code if failed

errCode

0..1

Alphanumeric

4.1.4

Authentication code

actn

0..n

Numeric

4.2

Response Reference

<Resp.Ref>

1..n

Alphabetic

Fixed

        Technical Specification Document                               205 | P a g e

Min :1
Max:20

Min:1
Max:20

Min:1
Max:40

M

C

O

M

027_Response_ErrCode

033_RespPay_ActnCode

012_ReqTxn_Pay

4.2.1
4.2.2

Reference type
Sequence Number

type
seqNum

4.2.3

Payment alias

addr

1..1
1..1

1..1

Code
Numeric

Fixed
Min:1
Max:3

Alphanumeric Min:1

4.2.4

Settlement Amount

settAmount

1..1

Numeric

4.2.5

Settlement Currency

settCurrency

1..1

Text

Max:255

Min Inclusive
: 0
total Digits:
15

Min:1
Max:3

4.2.6

Approval Reference Number

approvalNum

1..1

Alphanumeric Length=6

4.2.7

Response code

respCode

1..1

Alphanumeric Min:1

Max:20

4.2.8

Registered name with bank

regName

1..1

Alphanumeric Min:1

4.2.9

Original amount

orgAmount

1..1

Numeric

Max:99

Min
Inclusive: 0
total Digits:
15

013_ReqTxn_Collect
016_RespPay_Pay
017_RespPay_Collect
018_RespPay_Reversal
016_RespPay_Pay
056_seqNum

051_ReqPay_Amount_Value

025_Response_ApprovalNu
m

051_ReqPay_Amount_Value

M
M

M

M

M

M

M

M

M

4.2.10 Reversal Response Code

reversalRespCo
de

0..1

Alphanumeric Min: 1

C

028_Response_Reversal

Max: 20

This is mandatory in the case
of REVERSAL

        Technical Specification Document                               206 | P a g e

4.2.11

Alias Directory
Id/cmId

Id/ numeric

cmId

1.1

Alphanumeric Min:6

C

Max:25

This needs to be populated
in case a transaction is done
using Mobile number

4.2.12

Account number

acNum

1..1

Alphanumeric Min:1

4.2.13 Merchant Classification Code

code

MCC

4.2.14
4.2.15

IFSC code
Account type

Consent

Name

Value

4.3

4.3.1

4.3.2

IFSC
accType

<Resp.Consent

> name

value

1..1

1..n
1..n

0..1

1..n

1..1

Max:30

Numeric

Length= 4

Alphanumeric Length: 11
Code

Fixed

Alphabetic

Fixed

Alphanumeric Min:1

Code

Max: 50
Fixed

4.3.3

Type

type

1..1

Alphabetic

Fixed

M

M

M
M

O

M

M

M

024_Txn_code

032_RespPay_RefTag_IFSC
048_ReqPay_Ac_name_Acco
unt
For future use

Sample API message is given below –

<upi:RespPay xmlns:upi="http://npci.org/upi/schema/">

<Head ver="2.0" ts="" orgId="" msgId="" prodType= "UPI"/>
<Txn id="" note="" refId="" custRef="" refUrl="" ts="" purpose=""
type="PAY|COLLECT|DEBIT|CREDIT|REVERSAL" subType="" initiationMode="" orgTxnId="" refCategory="">
  <RiskScores>

  <Score provider="sp" type="TXNRISK" value=""/>
     <Score provider="npci" type="TXNRISK" value=""/>
  </RiskScores>

        Technical Specification Document                               207 | P a g e

</Txn>
<Resp reqMsgId="" result="SUCCESS|FAILURE|DEEMED" errCode="" actn="">
<Ref type="PAYER" seqNum="" addr="" regName="" acNum="" IFSC="" code="" accType="" settAmount="" orgAmount=""
settCurrency="" approvalNum="" respCode="" reversalRespCode="" cmId=""
<Ref type="PAYEE" seqNum="" addr="" regName="" acNum="" IFSC="" code="" accType="" settAmount="" orgAmount=""
settCurrency="" approvalNum="" respCode="" reversalRespCode="" cmId=""    />
</Resp>
</upi:RespPay>

/>

4.4.2. Authorization Details API

Refer Reference Logs Payment Request

4.4.2.1. ReqAuthDetails

Sr No

Message Item

<XMLTag>

Occurrence Data type

Length

M/O/C

Rules

1.1
1.1.1

2.1
2.1.1

2.1.2

2.1.3

2.1.4

API Name
API Schema namespace

<ReqAuthDetails>
xmlns

Header for the message
Version of the API

Time of request from the creator of
the message
Organization id that created the
message
Message
to
identifier-
correlate between request and
response

used

<Head>
ver

ts

orgId

msgId

1..1
1..1

1..1
1..1

1..1

1..1

1..1

Alphanumeric Min: 1

M
M

Alphabetic
Numeric

ISODateTime

Numeric

Alphanumeric

M
M

Max: 255
Fixed
Min: 1
Max: 6
Min: 1
Max: 255
Min: 6
Max: 20
Length: 35 M

M

M

019_Head_Versio
n
020_Head_ts

055_OrgId

021_Head_MsgId

        Technical Specification Document                               208 | P a g e

2.1.5

This field denotes the Product Type prodType

3.1

3.1.1

3.2.2

3.2.3

3.2.4

3.2.5

3.2.6

3.2.7

3.2.8

of

information

Transaction
on,
Carried throughout the system,
visible to all parties
Unique
the
Identifier
transaction across all entities,
created by the originator
Description of
transaction
(which will be printed on Passbook)
Consumer reference number to
identify (like Loan number, etc.)
URL for the transaction

the

<Txn>

id

note

refId

refUrl

Transaction origination time by the
creator of the message
Type of the Transaction

ts

type

ID when

Original
transaction
reversal/ Refund has to be done
Customer reference number for
the initiated transaction

orgTxnId

custRef

3.2.9

Initiation mode

initiationMode

3.2.10

Purpose of the txn

purpose

1..1

1..1

Alphanumeric

Fixed

Alphabetic

Fixed

M

M

Value to be
passed: “UPI”

1..1

Alphanumeric

Length: 35 M

022_Txn_UUID

1..1

1..1

1..1

1..1

1..1

0..1

1..1

1..1

1..1

Alphanumeric Min: 1

Max: 50

Alphanumeric Min: 1

Max: 35

Alphanumeric Min: 1

ISODateTime

Code

Max: 35
Min: 1
Max: 255
Min: 1
Max: 35

M

M

M

M

M

Alphanumeric

Length: 35 C

Numeric

Length: 12 M

Code

Code

Min: 1
Max: 3
Fixed

M

M

057_note

058_refUrl

020_Head_ts

008*ReqAuth*
Pay
009_ReqAuth_Col
lect
023_Txn_orgTxnId

This is the unique
value generated
by the participant
for the
transaction.
031_Txn_Initiatio
nmode
045_ReqPay_Txn
\_purpose

        Technical Specification Document                               209 | P a g e

052_ReqPay_Txn
\_refCategory

This field is
mandatory in
case of
type=”COLLECT”

3.2.11

Reference Category

refCategory

4.1

4.1.1

4.1.1.1

related

Risk Score
to
transaction and the entities
to
Risk Score
transaction and the entities
Entity providing the risk score

related

the

<Txn.RiskScores>

the

< Txn.RiskScores
.Score>
provider

4.1.1.2

Type of risk

4.1.1.3

5.1

Value of risk evaluation ranging
from 0 (No Risk) to 100 (Maximum
Risk)
Rules that govern the payment

type

value

0..1

0..1

1..n

1..1

1..1

1..1

Code

Fixed

Alphabetic

Fixed

Alphabetic

Fixed

Code

Code

Integer

Min: 1
Max: 20
Min: 1
Max: 99
Min: 1
Max: 5

O

O

M

M

M

M

<Txn.Rules>

0..1

Alphabetic

Fixed

C

5.2
5.2.1

Rule for the transaction
Name of the property

<Txn.Rules.Rule>
name

5.2.2

Value of the property

value

5.3
5.3.1

5.3.2

5.3.3

5.3.4

<Txn.Qr>
qVer

Qr Block
This field indicates the version of
IPS QR being used.
This field indicates QR generation
timestamp
This field indicates the QR medium
tag denotes Source channel i.e.
creation point of the QR.
This field indicates QR Expiry date & expireTs

ts

qrMedium

1..n
1..n

1..n

0..1
1..1

0..1

0..1

Alphabetic
Code

Fixed
Min: 1
Max: 255

Alphanumeric Min: 1

Alphabetic
Numeric

Max: 99

Min :1
Max : 6

ISODateTime Min :1

Numeric

Max : 255
Min :1
Max :99

M
M

M

O
M

O

O

0..1

ISODateTime Min :1

O

        Technical Specification Document                               210 | P a g e

to

‘QRexpire’

time Mapped
parameter in QR string.
This field indicates Query
This field indicates Verification
token for QR request. This will be
passed in the financial request
Reference to International partner
for ValQr and Financial request
generated by the International
Partner
This field indicates
STAN present in QR It denotes the
value generated and passed by the
acquiring
internal
reconciliation
Details related to the Payer
Alias of the Payer

bank

for

5.3.5
5.3.6

5.3.7

6.1
6.1.1

6.1.2

Name of the Payer

6.1.3

6.1.4

6.1.5

6.2

for

identifier

Unique
each
transaction inside a file including
payer and payee
Type of the Payer

Merchant Classification Code –
MCC
Merchant block

query
verToken

0..1

JSON
String

Max :255

O
O

Min :1
Max :80

stan

0..1

String

Length:6 O

<Payer>
addr

name

seqNum

type

code

<Payer.Merchant>

1..1
1..1

1..1

1..1

1..1

1..1

0..1

Alphabetic
Fixed
Alphanumeric Min: 1

Alphanumeric Min: 1

Max: 255

Numeric

Max: 99
Min: 1
Max: 3

Code

Fixed

M
M

M

M

M

Numeric

Length: 4 M

Alphabetic

Fixed

O

O

056_seqNum

029*Payer/Payee*
Type
024_Txn_code

037_ReqPay_Pay
er/Payee_Mercha
ntTag

6.2.1

Identifier

<Payer.Merchant.Identifi

0..1

Alphabetic

Fixed

        Technical Specification Document                               211 | P a g e

6.2.1.1
Subcode
6.2.1.2 Merchant Identifier

6.2.1.3

Store id

6.2.1.4

Terminal Identifier

6.2.1.5 Merchant type
6.2.1.6 Merchant Genre
6.2.1.7 Merchant onboarding Type
6.2.1.8

This field indicates the Registration
Id
This field indicates the Area pin
code
This field indicates the tier of the
city
Name of the merchant

6.2.1.9

6.2.1.10

6.3

er>
subCode
mid

sid

tid

merchantType
merchantGenre
onBoardingType
regIdNo

pinCode

tier

0..1
1..1

0..1

0..1

0..1
0..1
0..1
0..1

0..1

0..1

Code
Alphanumeric Min: 1

Length:4

Max: 20

Alphanumeric Min: 1

Max: 20

Alphanumeric Min: 1

Max: 20
Fixed
Fixed
Fixed

Alphabetic
Alphabetic
Alphabetic
Alphanumeric Max:35

Numeric

Fixed

Alphanumeric Code

<Payer.Merchant.Name> 0..1

Alphabetic

Min: 1
Max: 99

6.3.1

Brand

6.3.2

Legal

brand

legal

6.3.3

Franchise

franchise

6.4

Ownership

6.4.1

Type

<Payer.Merchant.Owner
ship>
type

1..n

0..1

0..1

0..1

0..1

Alphanumeric Min: 1

Max: 99

Alphanumeric Min: 1

Max: 99

Alphanumeric Min: 1

Alphabetic

Max: 99
Fixed

Code

Fixed

6.5

This field

indicates the

invoice <Payer.Merchant.Invoice 0..1

Alphabetic

        Technical Specification Document                               212 | P a g e

O
O

O

O

O
O
O
O

O

O

O

M

O

O

O

O

O

038_ReqPay_Mer
chantTag_Owner
ship_Type

6.5.1

6.5.2

6.5.3

6.6

invoice

indicates the

details.
This field
name
This field indicates the Invoice
Number.
This field indicates the
Invoice Date.
Information related to the Payer

6.6.1

6.6.1.2

is mandatory for

Payer Identity
“pay” and optional for “collect”
Id of the identifier

id

> name

num

date

<Payer.Info>

1..1

1..1

1..1

0..1

Alphanumeric Min: 1

Max: 99
Alphanumeric Max :20

ISODateTime Min: 1

Alphabetic

Max: 255
Fixed

<Payer.Info.Identity>

1..1

Alphabetic

Fixed

6.6.1.3
6.6.1.4

Type of the Identifier
Name as per the identifier

type
verifiedName

6.7
6.7.1

Rating of the payer
Verified Address

<Payer.Info.Rating>
verifiedAddress

1..1

1..1
1..1

0..1
0..1

Alphanumeric Min: 1

Max: 99
Code
Fixed
Alphanumeric Min: 1

Alphabetic
Code

Max: 99
Fixed
Boolean
TRUE/
FALSE
Fixed

6.8

Only one entity is allowed for a
payer

<Payer.Ac>

0..1

Alphabetic

6.8.1

Type of the alias

addrType

6.9

Details related to Payer Alias

<Payer.Ac.Detail>

1..1

1..n

Code

Alphabetic

Min: 1
Max: 20
Fixed

        Technical Specification Document                               213 | P a g e

M

M

M

C

M

M

M
M

O
M

C

M

M

008_ReqAuth_Pa
y
009_ReqAuth_Co
llect

026*Payer/Payee*
InfoRating

008_ReqAuth_Pa
y
009_ReqAuth_Co
llect
046_ReqPay_Ac_a
ddrType

6.9.1

Name of the property

name

1..n

Code

Fixed

M

6.9.2

Value of the property

value

6.10

6.10.1

Information related to the amounts
in the transaction
Transaction amount

<Payer.Amount>

value

1..n

1..1

1..1

Alphanumeric Min: 1

Alphabetic

Numeric

6.10.2

Currency of the transaction

curr

1..1

Text

6.10.3

Details of transaction amount

<Payer.Amount.Split>

0..1

Alphabetic

6.10.3.1 Name of the property
6.10.3.2 Value of the property

name
value

7.1
7.1.1
7.1.1.1

Details related to the Payees
Details related to the Payee
Alias of the Payee

<Payees>
< Payees.Payee>
addr

7.1.1.2

Name of the Payee

7.1.1.3

7.1.1.4

for

identifier

each
Unique
transaction inside a file including
Payee and payee
Type of the Payee

name

seqNum

1..n
1..n

1..1
1..1
1..1

1..1

1..1

Code
Fixed
Alphanumeric Min: 1

Max: 99
Fixed
Alphabetic
Alphabetic
Fixed
Alphanumeric Min: 1

Max: 255

Alphanumeric Min: 1

Max: 99

Alphanumeric Min: 1
Max: 3

type

1..1

Numeric

Fixed

        Technical Specification Document                               214 | P a g e

048_ReqPay_Ac_n
ame_Account
049_ReqPay_Ac_n
ame_Mobile
050_ReqPay_Ac_n
ame_Card

051_ReqPay_Amou
nt_Value

This is for future
use.

056_seqNum

029*Payer/Payee*

Max: 20
Fixed

Min
Inclusive:
0 total
Digits:15
Min: 1
Max: 3
Fixed

M

M

M

M

O

M
M

M
M
M

M

M

M

7.1.1.5 Merchant Classification Code -

code

7.1.1.6

MCC
Alias Directory Id/ numeric Id/cmId cmId

1..1

0.1

Numeric

Length:4 M

Alphanumeric Min:6

C

Max:25

7.2

Information related to the Payee

<Payee.Info>

1..1

Alphabetic

Fixed

C

7.2.1
7.2.1.1
7.2.1.2

Payee Identity
Type of the identifier
Name as per the identifier

<Payee.Info.Identity>
type
verifiedName

7.2.1.3

Id of the identifier

id

7.2.2
7.2.2.1

Rating of the Payee
verifiedAddress

<Payee.Info.Rating>
verifiedAddress

1..1
1..1
1..1

1..1

0..1
1..1

Fixed
Alphabetic
Code
Fixed
Alphanumeric Min: 1

Max: 99

Alphanumeric Min: 1

Alphabetic
Code

Max: 99
Fixed
Boolean
TRUE/FAL
SE
Fixed

M
M
M

M

O
M

C

7.3

Merchant block

<Payee.Merchant>

0..1

Alphabetic

        Technical Specification Document                               215 | P a g e

Type
024_Txn_code

This is mandatory
in case of
transaction
dome using
Mobile Number
/Merchant Id

008_ReqAuth_Pa
y
009_ReqAuth_Co
llect

026*Payer/Payee*
InfoRating

037_ReqPay_Pay
er/Payee_Mercha
ntTag

In case of a P2M
txn the merchant
tag is mandatory.

7.3.1

Identifier

7.3.1.1
Subcode
7.3.1.2 Merchant Identifier

7.3.1.3

Store id

7.3.1.4

Terminal Identifier

7.3.1.5 Merchant type
7.3.1.6 Merchant Genre
7.3.1.7 Merchant onboarding Type
indicates
7.3.1.8

the

field

field

indicates

This
RegistrationId
This
pincode
This field indicates the tier of the
city
Name

the Area

7.3.1.9

7.3.1.10

7.4

7.4.1

Brand

7.4.2

Legal

7.4.3

Franchise

7.5

Ownership

7.5.1

Type

<Payee.Merchant.Identifi
er>
subCode
mid

sid

tid

merchantType
merchantGenre
onBoardingType
regIdNo

pinCode

tier

<Payee.Merchant.Name

> brand

legal

franchise

<Payee.Merchant.Owner
ship>
type

1..1

0..1
1..1

0..1

0..1

0..1
0..1
0..1
0..1

0..1

0..1

0..1

1..1

0..1

0..1

0..1

1..1

Alphabetic

Fixed

Code
Alphanumeric Min: 1

Length:4

Max: 20

Alphanumeric Min: 1

Max: 20

Alphanumeric Min: 1

Alphabetic
Alphabetic
Alphabetic
Alphanumeric

Max: 20
Fixed
Fixed
Fixed
Max:35

Numeric

Fixed

Alphanumeric Code

Alphabetic

Min: 1
Max: 99

Alphanumeric Min: 1

Max: 99

Alphanumeric Min: 1

Max: 99

Alphanumeric Min: 1

Alphabetic

Max: 99
Fixed

Code

Fixed

M

O
M

O

O

O
O
O
O

O

O

O

M

O

O

O

M

038_ReqPay_Mer
chantTag_Owner
ship_Type

        Technical Specification Document                               216 | P a g e

7.5.2

7.5.2.1

7.5.2.2

7.5.2.3

7.6

7.6.1

7.7
7.7.1
7.7.2

7.8

7.8.1

invoice

invoice

indicates the

indicates the

indicates the

This field
details.
This field
name
This field
Number.
This field
Date.
Only one entity is allowed for a
Payee
Type of the alias

indicates the

Invoice

Invoice

<Payee.Merchant.Invoic
e>
name

num

date

<Payee.Ac>

addrType

Details related to Payee Alias
Name of the property
Value of the property

<Payee.Ac.Detail>
name
value

Information related to the amounts
in the transaction
Transaction amount

<Payee.Amount>

value

7.8.2

Currency of the transaction

curr

7.8.3
7.8.3.1
7.8.3.2

Details of transaction amount
Name of the property
Value of the property

<Payee.Amount.Split>
name
value

Sample API message is given below –

0..1

1..1

1..1

1..1

0..1

1..1

1..n
1..n
1..n

1..1

1..1

1..1

0..1
1..n
1..n

Alphabetic

Alphanumeric Min:1

Max: 99
Alphanumeric Max :20

ISODateTime Min: 1

Alphabetic

Max: 255
Fixed

Code

Min: 1
Max: 20
Fixed
Alphabetic
Code
Fixed
Alphanumeric Min: 1

Alphabetic

Max: 99
Fixed

Text

Numeric

Min
Inclusive:
0 total
Digits: 15
Min: 1
Max: 3
Fixed
Alphabetic
Code
Fixed
Alphanumeric Min: 1

Max: 99

C

M

M

M

C

M

M
M
M

M

M

M

O
M
M

009_ReqAuth_Co
llect

051_ReqPay_Amou
nt_Value

        Technical Specification Document                               217 | P a g e

<upi:ReqAuthDetails xmlns:upi="http://npci.org/upi/schema/">

<Head ver="1.0|2.0" ts="" orgId="NPCI" msgId="" prodType= "UPI"/>
<Txn id="" note="" refId="" custRef="" refUrl="" ts=""
type="PAY|COLLECT|DEBIT|CREDIT|REVERSAL|REFUND" initiationMode="" purpose="" refCategory="" >

<RiskScores>

<Score provider="sp" type="TXNRISK" value=""/>
<Score provider="NPCI" type="TXNRISK" value=""/>

</RiskScores>
<Rules>

<Rule name="EXPIREAFTER" value="1 minute to max 64800 minutes"/>

         <Rule name="MINAMOUNT" value=""/>

</Rules>
<QR qVer="" ts="" qrMedium="" expireTs="" query=""/>

</Txn>
<Payer addr="" name="" seqNum="" type="PERSON|ENTITY" code="">

<Merchant>

<Identifier subCode="" mid="" sid="" tid="" merchantType="" merchantGenre=""
onBoardingType="" pinCode="" regIdNo="" tier="" />
<Ownership type=""/>
<Invoice name="" num="" date="" />

</Merchant>
<Info>

<Identity id="" type="ACCOUNT" verifiedName=""/>
<Rating VerifiedAddress="TRUE|FALSE"/>

</Info>
<Ac addrType="ACCOUNT">

<Detail name="IFSC" value=""/>
<Detail name="ACTYPE" value=""/>
<Detail name="ACNUM" value=""/>

</Ac>
<Amount value="" curr="NAD">

<Split name="" value=""/>

</Amount>

</Payer>

        Technical Specification Document                               218 | P a g e

<Payees>

<Payee seqNum="" addr="" name="" type="PERSON|ENTITY" code="" cmId="">

<Info>

<Identity id="" type="ACCOUNT" verifiedName=""/>
<Rating VerifiedAddress="TRUE|FALSE"/>

</Info>
<Merchant>

<Identifier subCode="" mid="" sid="" tid="" merchantType="" merchantGenre=""
onBoardingType="" pinCode="" regIdNo="" tier="" />
<Ownership type=""/>
<Invoice name="" num="" date="" />

</Merchant>
<Ac addrType="ACCOUNT">

<Detail name="IFSC" value=""/>
<Detail name="ACTYPE" value=""/>
<Detail name="ACNUM" value=""/>

</Ac>
<Amount value="" curr="NAD">

<Split name="" value=""/>

</Amount>

</Payee>

</Payees>

</upi:ReqAuthDetails>

4.4.2.2. RespAuthDetails

Sr No

Message Item

<XMLTag>

Occurrence Data type

Length

M/O/C Rules

1.1
1.1.1

API Name
API Schema namespace

<RespAuthDetails>
xmlns

2.1

Header for the message

<Head>

1..1
1..1

1..1

Alphanumeric Min: 1

Alphabetic

Max: 255
Fixed

M
M

M

        Technical Specification Document                               219 | P a g e

2.1.1

Version of the API

ver

2.1.2

2.1.3

2.1.4

2.1.5

3.1

3.1.1

3.2.2

3.2.3

3.2.4

3.2.5

3.2.6

3.2.7

3.2.8

Time of request from the creator of the
message
Organization id that created the message orgId

ts

identifier- used to correlate

Message
between request and response
This field denotes the Product Type

msgId

prodType

information,

Transaction
Carried
throughout the system, visible to all
parties
Unique
Identifier of the transaction
across all entities, created by the
originator
Description of the transaction (which will
be printed on Passbook)
Consumer reference number to identify
(like Loan number, etc.)
URL for the transaction

<Txn>

id

note

refId

refUrl

Transaction origination time by the creator
of the message
Type of the Transaction

ts

type

transaction

Original
reversal/Refund has to be done
Customer
reference number
initiated transaction

ID

when

orgTxnId

for

the

custRef

1..1

1..1

1..1

1..1

1..1

1..1

Numeric

ISODateTime

Numeric

Alphanumeric

Alphanumeric

Min: 1
Max: 6
Min: 1
Max: 255
Min: 1
Max: 20
Length:
35
Fixed

Alphabetic

Fixed

1..1

Alphanumeric

Length:
35

1..1

1..1

1..1

1..1

1..1

0..1

1..1

Alphanumeric Min: 1

Max: 50

Alphanumeric Min: 1

Max: 35

Alphanumeric Min: 1

ISODateTime

Code

Max: 35
Min: 1
Max: 255
Min: 1
Max: 20

Alphanumeric

Numeric

Length:
35
Length:
12

M

M

M

M

M

M

M

M

M

M

M

M

C

M

019_Head_Ver
sion
020_Head_ts

055_OrgId

021_Head_Msg
Id
Value to be
passed: “UPI”

022_Txn_UUID

057_note

058_refUrl

020_Head_ts

010*RespAuth*
Pay
011*RespAuth*
Collect
023*Txn*
orgTxnId
This is the
unique value

        Technical Specification Document                               220 | P a g e

3.2.9

Initiation mode

initiation Mode

3.2.10

Purpose of the txn

3.2.11

Reference Category

purpose

refCategory

1..1

1..1

1..n

Code

Code

Code

Min: 1
Max: 3
Fixed

Fixed

4.1

4.1.1

Risk Score related to the transaction and the
entities
Risk Score related to the transaction and the
entities

<Txn.RiskScores>

0..1

Alphabetic

Fixed

<Txn.RiskScores.Scor
e>

1..n

Alphabetic

Fixed

4.1.1.1

Entity providing the risk score

provider

4.1.1.2

Type of risk

4.1.1.3

5.1

Value of risk evaluation ranging from 0 (No
Risk) to 100 (Maximum Risk)
Rules that govern the payment

type

value

<Txn.Rules>

5.2
5.2.1

Rule for the transaction
Name of property

<Txn.Rules.Rule>
name

5.2.2

Value of the property

value

1..1

1..1

1..1

0..1

1..n
1..n

1..n

Code

Code

Integer

Alphabetic

Min: 1
Max: 20
Min: 1
Max: 99
Min: 1
Max: 50
Fixed

Alphabetic
Code

Fixed
Min: 1
Max: 20

Alphanumeric Min: 1

        Technical Specification Document                               221 | P a g e

generated by
the participant
for the
transaction.
031_Txn_Initiati
on mode
045_ReqPay_Tx
n_purpose
052_ReqPay_Tx
n_refCategory

If the
Txn.Riskscores
tag is present,
then this tag is
Mandatory

This field will
be mandatory
in case of
type=”COLLEC
T”

M

M

O

O

M

M

M

M

C

M
M

M

6.1
6.1.1

Details related to the Payer
Alias of the Payer

6.1.2

Name of the Payer

6.1.3

6.1.4

6.1.5
6.2

Unique identifier for each transaction
inside a file including payer and payee
Type of the Payer

Merchant Classification on Code –MCC
Merchant block

code
<Payer.Merchant>

<Payer>
addr

name

seqNum

type

6.2.1

Identifier

6.2.1.1
Subcode
6.2.1.2 Merchant Identifier

6.2.1.3

Store id

6.2.1.4

Terminal Identifier

<Payer.Merchant.Ide
ntifier>
subCode
mid

sid

tid

6.2.1.5 Merchant type
6.2.1.6 Merchant Genre
6.2.1.7 Merchant onboarding Type

merchantType
merchantGenre
onBoardingType

056_seqNum

029_Payer/Paye
e_Type
024_Txn_code
037_ReqPay_P
ayer/Payee_Me
rchantTag

In case of a
Refund txn the
merchant tag is
mandatory.

1..1
1..1

1..1

1..1

1..1

1..1
0..1

1..1

0..1
1..1

0..1

0..1

0..1
0..1
0..1

Max: 255
Alphabetic
Fixed
Alphanumeric Min: 1

Max: 255

Alphanumeric Min: 1

Numeric

Code

Max: 99
Min: 1
Max: 3
Fixed

M
M

M

M

M

Numeric
Alphabetic

Length: 4 M
C
Fixed

Alphabetic

Fixed

M

Code
Alphanumeric Min: 1

Length:4 O
M

Max: 20

Alphanumeric Min: 1

Max: 20

Alphanumeric Min: 1

Alphabetic
Alphabetic
Alphabetic

Max: 20
Fixed
Fixed
Fixed

O

O

O
O
O

        Technical Specification Document                               222 | P a g e

6.2.1.8
6.2.1.9
6.2.1.10
6.3

This field indicates the Registration ID
This field indicates the Area pin code
This field indicates the tier of the city
Name

6.3.1

Brand

6.3.2

Legal

6.3.3

Franchise

6.4

Ownership

6.4.1

Type

6.5

This field indicates the invoice details.

6.5.1

This field indicates the invoice name

regIdNo
pinCode
tier
<Payer.Merchant.Na
me>

brand

legal

franchise

<Payer.Merchant.Ow
nership>
type

<Payer.Merchant.Inv
oice>
name

6.5.2

6.5.3

6.6

This field indicates the Invoice
Number.
This field indicates the
Invoice Date.
Information related to the Payer

num

date

<Payer.Info>

0..1
0..1
0..1
0..1

1..1

0..1

0..1

0..1

1..1

0..1

1..1

1..1

1..1

0..1

Alphanumeric Max:35
Numeric
Fixed
Alphanumeric Code
Min: 1
Alphabetic
Max: 99

Alphanumeric Min: 1

Max: 99

Alphanumeric Min: 1

Max: 99

Alphanumeric Min: 1

Alphabetic

Max: 99
Fixed

Code

Fixed

Alphabetic

O
O
O
O

M

O

O

O

M

O

Alphanumeric Min: 1

M

Max: 99

Alphanumeric Max:20 M

ISODateTime Min: 1

M

Alphabetic

Max: 255
Fixed

C

6.6.1

6.6.1.2

Payer Identity Is mandator y for “pay” and
optional for “collect”
Id of the identifier

<Payer.Info.Identity> 1..1

Alphabetic

Fixed

id

1..1

Alphanumeric Min: 1

M

M

        Technical Specification Document                               223 | P a g e

038_ReqPay_M
erchantTag_O
wnership_Type

010_RespAuth
\_Pay
011_RespAuth
\_Collect

6.6.1.3
6.6.1.4

Type of the identifier
Name as per the identifier

type
verifiedName

1..1
1..1

Max: 99
Code
Fixed
Alphanumeric Min: 1

6.7
6.7.1

Rating of the payer
verified Address

< Payer.Info.Rating>
verifiedAddress

0..1
1..1

Alphabetic
Code

6.8

6.9
6.9.1

from which

Details of device
transaction was initiated
Device Tag
Name of the property

< Payer.Device.Tag>
name

1..n
1..n

the

<Payer.Device>

0..1

Alphabetic

Max: 99
Fixed
Boolean
TRUE/FA
LSE
Fixed

Fixed
Fixed

Alphabetic
Code (MOBILE,
GEOCODE,
LOCATION, IP,
TYPE, ID, OS,
APP,
CAPABILITY,
TELECOM )
Alphanumeric Min: 1

Max: 20

M
M

O
M

C

M
M

M

6.9.2

Value of the property

value

1..n

6.10

Only one entity is allowed for a payer

<Payer.Ac>

0..1

Alphabetic

Fixed

C

6.10.1

Type of the alias

addrType

1..1

Code

Min: 1

M

        Technical Specification Document                               224 | P a g e

026_Payer/Paye
e_InfoRating

011_RespAuth
\_Collect

034*ReqPay_D
eviceDetails_V
alues
035_ReqPay_D
eviceDetails_ty
pe
036_ReqPay_D
eviceDetails_O
S
010_RespAuth
\_Pay
011_RespAuth
\_Collect
046_ReqPay_Ac*

6.11
6.11.1

Details related to Payer Alias
Name of the property

< Payer.Ac.Detail>
name

1..n
1..n

Alphabetic
Code

Max: 20
Fixed
Fixed

6.11.2

Value of the property

value

6.12

Information
Credentials

related

to

the Payer

<Payer.Creds>

1..n

0..1

Alphanumeric Min: 1

Alphabetic

Max: 20
Fixed

M
M

M

C

6.12.1

Credentials are used to authenticate the
request

<Payer.Creds.Cred>

1..1

Alphabetic

Fixed

M

6.12.1.1

Type of financial instrument used for
authentication

type

6.12.1.2 Subtype

subType

1..1

1..1

Code

Code

Fixed

Fixed

6.12.2

base-64

encoded/

encrypted <Payer.Creds.Cred.D 1..1

Alphabetic

Fixed

M

M

M

        Technical Specification Document                               225 | P a g e

addrType

048_ReqPay_Ac
\_name_Account
049_ReqPay_Ac
\_name_Mobile
050_ReqPay_Ac
\_name_Card

011_RespAuth
\_Collect

This will be
mandatory in
case of type =
”COLLECT”
040*ReqPay_Cr
edblo ck
041_RespAuthD
etail UPI-
Mandate_Colle
ctCred block
007_ReqPay_Pr
eAp proved
025_Response*
ApprovalNum

040_ReqPay_Cr
edblo ck

authentication data

6.12.2.1 Data Code
6.12.2.3 Key Index
6.13

Information related to the amounts in the
transaction
Transaction amount

6.13.1

ata>
code
ki
<Payer.Amount>

value

6.13.2

Currency of the transaction

curr

6.14

Details of transaction amount

6.14.1

Name of the property

<Payer.Amount.Split

> name

6.14.2

Value of the property

value

7.1
7.1.1
7.1.1.2

Details related to the Payees
Details related to the Payee
Alias of the Payee

<Payees>
<Payees.Payee>
addr

7.1.1.3

Name of the Payee

7.1.1.4

7.1.1.5

Unique identifier for each transaction
inside a file including Payee and Payee
Type of the Payee Merchant

7.1.1.6 Merchant Classification on Code –MCC
7.1.1.7

Alias Directory Id/ numeric Id/cmId

name

seqNum

type

code
cmId

1..1
1..1
1..1

1..1

1..1

0..1

1..n

1..n

1..1
1..1
1..1

1..1

1..1

1..1

1..1
0.1

Code
Alphanumeric
Alphabetic

Fixed
Fixed
Fixed

Numeric

Text

Alphabetic

Code

Min
Inclusive
:0 total
Digits:15
Min: 1
Max: 3
Fixed

Min: 1
Max: 20

Alphanumeric Min: 1

Max: 99
Fixed
Alphabetic
Alphabetic
Fixed
Alphanumeric Min: 1

Max: 99

Alphanumeric Min: 1

Numeric

Code

Max: 99
Min: 1
Max: 3
Fixed

M
M
M

M

M

O

M

M

M
M
M

M

M

M

Code
Alphanumeric Min:6

Length: 4 M
C

Max:25

051_ReqPay_Am
ount_Value

056_seqNum

029_Payer/Paye
e_Type
024_Txn_code
This will be
populated in
case of

        Technical Specification Document                               226 | P a g e

7.1.1.8

Information related to the Payee

<Payee.Info>

0..1

Alphabetic

Fixed

C

7.2

Payee Identity

7.2.1
7.2.2

Type of the identifier
Name as per the identifier

<Payee.Info.Identity

> type
> verifiedName

7.2.3

Id of the identifier

id

1..1

1..1
1..1

1..1

Alphabetic

Fixed

Code
Fixed
Alphanumeric Min: 1

Alphanumeric Min: 1

Max: 99

7.4
7.4.1

Rating of the Payee
verifiedAddress

<Payee.Info.Rating>
verifiedAddress

0..1
1..1

Alphabetic
Code

7.5

Merchant block

<Payee.Merchant>

0..1

Alphabetic

Max: 99
Fixed
Boolean
TRUE/FA
LSE
Fixed

M

M
M

M

O
M

C

7.5.1

Identifier

<Payee.Merchant.Id
entifier>

1..1

Alphabetic

Fixed

M

        Technical Specification Document                               227 | P a g e

transaction
done using
Mobile
number/Merch
ant ID

010_RespAuth
\_Pay
011_RespAuth
\_Collect

026_Payer/Paye
e_InfoRating

037_ReqPay_P
ayer/Payee_Me
rchantTag

This tag is
mandatory in
case of P2M
transaction

Subcode
7.5.1.1
7.5.1.2 Merchant Identifier

7.5.1.3

Store id

7.5.1.4

Terminal Identifier

7.5.1.5 Merchant type
7.5.1.6 Merchant Genre
7.5.1.7 Merchant onboarding Type
7.5.1.8
7.5.1.9
7.5.1.10
7.6

This field indicates the Registration Id
This field indicates the Area pincode
This field indicates the tier of the city
Name

7.6.1

Brand

7.6.2

Legal

7.6.3

Franchise

7.7

Ownership

7.7.1

Type

7.8

This field indicates the invoice details.

7.8.1

This field indicates the invoice name

subCode
mid

sid

tid

merchantType
merchantGenre
onBoardingType
regIdNo
pinCode
tier
<Payee.Merchant.Na
me>
brand

legal

franchise

<Payee.Merchant.O
wnership>
type

<Payee.Merchant.Inv
oice>
name

7.8.2

This field indicates the Invoice

num

0..1
1..1

0..1

0..1

0..1
0..1
0..1
0..1
0..1
0..1
0..1

1..1

0..1

0..1

0..1

1..1

0..1

1..1

1..1

Code
Alphanumeric Min: 1

Length:4 O
M

Max: 20

Alphanumeric Min: 1

Max: 20

Alphanumeric Min: 1

Max: 20
Fixed
Fixed
Fixed

Alphabetic
Alphabetic
Alphabetic
Alphanumeric Max:35
Numeric
Fixed
Alphanumeric Code
Min: 1
Alphabetic
Max: 99

Alphanumeric Min: 1

Max: 99

Alphanumeric Min: 1

Max: 99

Alphanumeric Min: 1

Alphabetic

Max: 99
Fixed

Code

Fixed

Alphabetic

Fixed

Alphanumeric Min:1

Max: 99

O

O

O
O
O
O
O
O
O

M

O

O

O

M

O

M

Alphanumeric Max:20 M

        Technical Specification Document                               228 | P a g e

038_ReqPay_M
erchantTag_O
wnership_Type

7.8.3

7.9
7.9.1

Number.
This field indicates the
Invoice Date.
Device Tag
Name of the property

date

<Payee.Device>
name

1..1

0..1
1..n

7.9.2

Value of the property

value

1..n

ISODateTime Min: 1

M

Max: 255
Fixed
Fixed

Alphabetic
Code(M
OBILE,G
EOCOD
E,LOCAT
ION,IP,T
YPE,ID,OS,APP
,CA
PABILITY,TELE
COM
Alphanumeric Min: 1

Max: 20

7.10
7.10.1

Only one entity is allowed for a Payee
Type of the alias

<Payee.Ac>
addrType

Details related to Payee Alias
Name of the property
Value of the property

<Payee.Ac.Detail>
name
value

1..1
1..1

1..n
1..n
1..n

Alphabetic
Code

Fixed
Min: 1
Max: 20
Fixed
Alphabetic
Code
Fixed
Alphanumeric Min: 1

Information related to the amounts in
the transaction
Transaction amount

<Payee.Amount>

1..1

Alphabetic

Max: 99
Fixed

value

1..1

Numeric

Min

        Technical Specification Document                               229 | P a g e

7.11
7.11.1
7.11.2

7.12

7.12.1

O
M

M

M
M

M
M
M

M

M

034_ReqPay_D
eviceDetails_V
alues
035_ReqPay_D
eviceDetails_ty
pe
036_ReqPay_D
eviceDetails_O
S

051_ReqPay_A

7.12.2

Currency of the transaction

curr

7.12.3

Details of transaction amount

7.12.3.1 Name of the property
7.12.3.2 Value of the property

<Payee.Amount.Split

> name
> value

1..1

0..1

1..n
1..n

Sample API message is given below –

mount_Value

Inclusive
:0
total
Digits: 15
Min: 1
Max: 3
Fixed

Text

Alphabetic

Code
Fixed
Alphanumeric Min: 1

Max: 99

M

O

M
M

<upi:RespAuthDetails xmlns:upi="http://npci.org/upi/schema/">

<Head ver="1.0|2.0" ts="" orgId="" msgId="" prodType= "UPI"/>
<Resp reqMsgId="" result="SUCCESS|FAILURE" errCode=""/>
<Txn id="" note="" refId=""  custRef="" refUrl="" ts="" orgTxnId=""
type="PAY|COLLECT|DEBIT|CREDIT|REVERSAL|REFUND" refCategory="" initiationMode="" purpose="" >

<RiskScores>

<Score provider="sp" type="TXNRISK" value=""/>
<Score provider="NPCI" type="TXNRISK" value=""/>

</RiskScores>
<Rules>

<Rule name="EXPIREAFTER" value="1 minute to max 64800 minutes"/>
<Rule name="MINAMOUNT" value=""/>

</Rules>

</Txn>
<Payer addr="" name="" seqNum="" type="PERSON|ENTITY" code="">

<Merchant>

<Identifier subCode="" mid="" sid="" tid="" merchantType="" merchantGenre=""
onBoardingType="" pinCode="" regIdNo="" tier="" />

        Technical Specification Document                               230 | P a g e

<Ownership type=""/>
<Invoice name="" num="" date="" />

</Merchant>
<Info>

<Identity id="" type="ACCOUNT" verifiedName="" />
<Rating VerifiedAddress="TRUE|FALSE"/>

</Info>
<Device>

<Tag name="MOBILE" value=""/>
<Tag name="GEOCODE" value=""/>
<Tag name="LOCATION" value="" />
<Tag name="IP" value=""/>
<Tag name="TYPE" value=""/>
<Tag name="ID" value=""/>
<Tag name="OS" value=""/>
<Tag name="APP" value=""/>
<Tag name="CAPABILITY" value=""/>
<Tag name="TELECOM" value=""/>

</Device>
<Ac addrType="ACCOUNT">

<Detail name="IFSC" value=""/>
<Detail name="ACTYPE" value=""/>
<Detail name="ACNUM" value=""/>

</Ac>
<Creds>
<Cred type="PIN" subType="MPIN">

<Data code="" ki=""> base-64 encoded/encrypted authentication data</Data>

</Cred>
<Cred  type="PREAPPROVED"  subType="NA">
<Data>  base-64 encoded</Data>

</Cred>
<Cred type="UPI-Mandate" subType="DS">

<Data> base-64 encoded digitally signed UPI-Mandate</Data>

</Cred>

</Creds>

        Technical Specification Document                               231 | P a g e

<Amount value="" curr="NAD">

<Split name="PURCHASE|CASHBACK" value=""/>

</Amount>

</Payer>
<Payees>

<Payee addr="" name="" seqNum="" type="PERSON|ENTITY" code="" cmId="" >

<Merchant>

<Identifier subCode="" mid="" sid="" tid="" merchantType="" merchantGenre=""
onBoardingType="" pinCode="" regIdNo="" tier="" />
<Ownership type=""/>
<Invoice name="" num="" date="" />

</Merchant>
<Info>

<Identity id="" type="ACCOUNT" verifiedName="" />
<Rating VerifiedAddress="TRUE|FALSE"/>

</Info>
<Device>

<Tag name="MOBILE" value=""/>
<Tag name="GEOCODE" value=""/>
<Tag name="LOCATION" value="" />
<Tag name="IP" value=""/>
<Tag name="TYPE" value=""/>
<Tag name="ID" value=""/>
<Tag name="OS" value=""/>
<Tag name="APP" value=""/>
<Tag name="CAPABILITY" value=""/>
<Tag name="TELECOM" value=""/>

</Device>
<Ac addrType="ACCOUNT">

<Detail name="IFSC" value=""/>
<Detail name="ACTYPE" value=""/>
<Detail name="ACNUM" value=""/>

</Ac>
<Amount value="" curr="NAD">

<Split name="" value=""/>

        Technical Specification Document                               232 | P a g e

</Amount>

</Payee>

</Payees>

</upi:RespAuthDetails>

        Technical Specification Document                               233 | P a g e

5. Appendix

Rule Id

Condition

Value

Action

001_ReqPay_Pay

if(type=PAY)

PAY

002_ReqPay_Collect

if(type=COLLECT
)

COLLECT

003_ReqPay_Debit

if(type=DEBIT)

DEBIT

If it is a PAY txn below tags are
mandatory
Under Payer

Info Tag

1.
2. Device tag
3. Account tag
4. Amount tag
5. Cred tag

Under Payee

1.  Payee tag.
2.  Amount tag

If it is a COLLECT txn below tags are
mandatory.
Under payee tag

Info Tag

1.
2. Device tag details
3. Account tag
4. Amount tag.

Under Payer tag

1.  Amount tag.

If type is DEBIT below tags are
mandatory.

Under Payer tag
Info Tag

1.
2. Device tag
3. Account tag
4. Amount tag.
5. Cred tag

Under Payee tag

Info tag

1.
2.  Account tag
3.  Amount tag
4.  Device tag (applicable only in

        Technical Specification Document                               234 | P a g e

004_ReqPay_Credit

if(type=CREDIT)

CREDIT

case

of COLLECT)

If type is CREDIT below tags are
mandatory.

Under Payer tag
Info Tag

1.
2. Device tag
3. Account tag
4. Amount tag

Under Payee tag

Info tag

1.
2. Device tag (applicable only in

case if COLLECT)

3.  Account tag
4.  Amount tag

005_ReqPay_DebitRev
ersal

006_ReqPay_CreditRe
versal

if(type=REVERSAL) REVERSAL This leg will be sent for reversal from IPS

to Remitter
If type is REVERSAL below tags are
mandatory.

Under Payer tag
Info Tag

1.
2. Account tag
3. Amount tag

if(type=REVERSAL) REVERSAL This leg will be sent for reversal from IPS

to Beneficiary
If type is REVERSAL below tags are
mandatory.

Under Payee tag

Info Tag

1.
2.  Account tag
3.  Amount tag

        Technical Specification Document                               235 | P a g e

007_ReqPay_PreAppr
oved

if(type=PAY&&Cred
.type=”PREAPPRO
VED”)/(type=COLL
ECT&&Cred.type=”
PREAPPROVED”)

PREAPPRO
VED

1.

2.

If txn type is PAY and PREAPPROVED,
then the following cred block should
be present in ReqPay
is COLLECT and
If
PREAPPROVED, then the following
cred block should be present
in
RespAuthDetails

type

txn

008_ReqAuth_Pay

if(type=PAY)

PAY

009_ReqAuth_Collect

if(type=COLLECT)

COLLECT

<Cred type=”PREAPPROVED
subType=”NA””>.

Format: respCode|approvalNum
Example –00|972345
"|" - to be used as delimiter
If type is PAY below tags are mandatory
in ReqAuthDetails

Under Payer tag
Info Tag

1.
2. Account tag
3. Amount tag

Under Payee tag

1. Amount tag

is COLLECT below tags are

in

If type
mandatory
ReqAuthDetails

Under Payer tag

1. Amount tag

Under Payee tag

Info Tag

1.
2.  Account tag
3.  Amount tag

        Technical Specification Document                               236 | P a g e

010_RespAuth_Pay

if(type=PAY)

PAY

If type is PAY below tags are mandatory
in RespAuthDetails Under Payer tag

Info Tag

1.
2. Account tag
3. Amount tag

Under Payee tag

Info Tag

1.
2. Account tag
3. Amount tag

011_RespAuth_Collect if(type=COLLECT)

COLLECT

is COLLECT below tags are

If type
mandatory in RespAuthDetails

Under Payer tag
Info Tag

1.
2. Account tag
3. Amount tag
4. Device tag
5. Cred tag

Under Payee tag

Info Tag

1.
2. Account tag
3. Amount tag

012_ReqTxn_Pay

if(type=PAY)

PAY

Ref tag of payee details will be present in
the ReqTxnConfirmation.

013_ReqTxn_Collect

if(type=
COLLECT)

COLLECT Ref tag of payer details will be present in

the ReqTxnConfirmation

016_RespPay_Pay

if(type=DEBIT)

DEBIT

Ref tag of payer details will only be sent
in the RespPay

        Technical Specification Document                               237 | P a g e

017_RespPay_Collect

if(type=CREDIT)

CREDIT

Ref tag of payee details will only be sent
in the RespPay

018_RespPay_Revers
al

if(type=REVERSAL) REVERSAL Ref tag of Payer details will be sent in

debit reversal

Ref tag of Payee details will be sent in
credit reversal

019_Head_Version

020_Head_ts

General

General

Numeric

Default is ’2.0’

ISODateti
me format

The string format should be: YYYY-
MM-DDTHH:mm:ss.sssZ
where:

,

YYYY-MM-DD – is the date: year-
month-day.

The character "T" is used as the
delimiter.

HH:mm:ss: sss – is the time: hours,
minutes, seconds and
milliseconds.

The 'Z' part denotes the time zone
in the format +- hh:mm

HH/hh = two digits of hour (00 through 23) (am/pm NOT allowed)
mm = two digits of minute (00 through 59)
ss = two digits of second (00 through 59)
sss= three digit of milli second (000
through 999)

+/- hh:mm = followed by time zone
difference from GMT in

        Technical Specification Document                               238 | P a g e

Merchant. MCC

hours and minutes.This is Mandatory
Message ID is unique for API.
It should be always 35 Digits. The first 3
digit should be bank Participation code
assigned by IPS followed by 32 digits
generated by UUID logic.
msgId field is populated in the request by
participants. The same msgId will be
provided in the acknowledgement and
response. Message id will be different for
the different API.
Transaction
for any
ID
transaction. It should be always 35
Digits. First 3-digit should be bank
Participation code assigned by
IPS
followed by 32-digit generated by UUID
Logic.
This field is populated in the request by
the participants. The same will be
provided in the acknowledgement and
response. id will be different for the
different API.
Mandatory, used only
Refund happens
“XXXX”
Code)

standards.
In case of the type =PERSON the MCC
code is 0000. If the type=ENTITY then
MCC code will be populated accordingly
on the agreed MCC.
6-digits must be Alphanumeric. If result
is
success, Approval number
is
mandatory
TRUE|FALSE

is MCC(Merchant Category

of
follows

if REVERSAL/

is unique

18245:

2003

ISO

the

021_Head_MsgId

General

Alphanum
eric

022_Txn_UUID

General

Alphanum
eric

023*Txn* orgTxnId

if(type=REVERSAL) Alphanumer

024_Txn_code

General

ic
PERSON=
0000
ENTITY=X
XXX

025_Response_Approv
alNum

if(Result=SUCCESS) Alphanum

eric

026_Payer/Payee_Info
Rating

General

Numeric

        Technical Specification Document                               239 | P a g e

027_Response_ErrCod
e

028_Response_Revers
al

029_Payer/Payee_Typ
e

030_Txn_SubType

031_Txn_Initiationmod
e

032_RespPay_RefTag
\_IFSC

General

This field will be populated in case of a
FAILURE. Error code and response code
document shared to Bank.
if(type=REVERSAL) Numeric Mandatory only if FAILURE

Alphanum
eric

General

PERSON/
ENTITY

Either PERSON/ENTITY.
If the type = ENTITY, then the Merchant
tag and its associated fields mentioned
in the respective API need to be
populated based on the merchant.
PAY/COLLECT

00=Default
01=QR Code
02=Secure QR Code
04=Intent
05=Secure Intent
10=SDK (Software Development Kit)
15-18 for future purpose

DEBIT/
CREDIT/
REVERSAL
/REFUND

01/02/
04/05/
10/14/00

IFSC

IFSC code of the respective bank should
be 11-digits.
ex: XXXX0483772

If(type=DEBIT/CRED
IT/REVERSAL/
REFUND)

If(type=PAY|COLLEC
T|DEBIT|CREDIT|REV
ERSAL|REFUND|Chk
Txn|TxnConfirmation
)

In mandate, if
(type=CREATE|UPD
ATE|REVOKE)
if(Response.result
=SUCCESS)

033_RespPay_ActCod
e

If (UIDAIAuth=FAIL
URE)

Tag value
=”
XXX|ZZZ”
Authentic
ation code

034*ReqPay_DeviceD
etails* Values

if(DEVICE.Tag
occurs)

Device
Values

IPS error code

Tag XXX” – Will be populated by
IPS from “err” tag of UIDAI AuthRes
ZZZ – Will be populated by IPS if present
in “actn” of UIDAI AuthRes. Else only XXX
will be present
Please
the
refer
document for UIDAI response codes
MOBILE:91nnnnnnnnnn
GEOCODE:nn.nnnn,nn.nnnn
LOCATION:Area with city, state and
Country Code
01-23- Terminal Address
24-36- Terminal City
37-38- Terminal State Code
39-40- Terminal Country Code

        Technical Specification Document                               240 | P a g e

IP address

format(v4,v6)
IP: Valid
TYPE:Min Length – 1 , Max Length – 20
(Refer Rule_035)
ID:Min Length – 1 , Max Length–35
OS:Min Length – 1 , Max Length–20
APP:Min Length – 1 , Max Length–20
CAPABILITY:Min Length – 1 , Max Length
– 99 (refer to DE-61)
“5200000200010004000
“. For
639292929292
more details, refer annexure document
TELECOM OPERATOR:Min
Length-1,Max Length-99 (It is mandatory
for USSD)
Initiating Channel

e.g:

035*ReqPay_DeviceD
etails* type

If(Device.tag.name=
”Type”)

Device
type

036*ReqPay_DeviceD
etails* OS

If(Device.tag.name=
”OS”)

037*ReqPay_Payer/Pa
yee* MerchantTag

If(Payer.type/Payee.
type=ENTITY)

1.  MOB(Mobile)
    INET(Internet)

2.
3.  USDC/USDB(USSD)
4.  POS(Point of Sale)
    Device OS OS of the initiating Device

iOS

1.
2. Android

Payer/Paye
e Merchant
block

If the merchant comes through an
aggregator, then the merchant block
element will contain the merchant
details as follows

2.

1.

Identifier.subCode=MCC code
of the merchant
Identifier.mid=”Merchant id”
Identifier.sid=”Store id”
Identifier.tid=”Terminal id” 4. 5. Name.brand = Brand any of the

3.

merchant

6.  Name.Legal=Legal Name of the

merchant

7.  Name.Franchise=Franchise

agent name

8.  Ownership.type= See rule 038
9.  merchantType=”SMALL|LARGE”

        Technical Specification Document                               241 | P a g e

10. merchantGenre=”OFFLINE|ONLI

NE”

11. onBoardingType=”BANK|AGGRE

GATOR”

Type of Ownership:
PROPRIETARY PARTNERSHIP PRIVATE
PUBLIC OTHERS

Possible
only
scenario occurs

if Reversal/Refund

Payer/Pay
ee
Merchant
tag_owner
\_type
TxnTag_Re
versal

038_ReqPay_Merchant
Tag_Ownership_Type

If(Payer.type=ENTIT
Y)

039_ReqPay_OrgResp
Code

If(txn.type=REVERSA
L)

If(Txn.type=Collect) Cred block This

041_RespAuthDetail
UPI-

mandate_CollectCredbl
ock

042_ReqPay_Initiation
mode

If(initiation
mode=”12”)

043_ReqPay_Institutio
n_type

If(type=”MTO|BANK”
)

044_ReqPay_Institutio
n_route

If(route=”MTSS|RDA
”)

Payers
institution
block

Payers
Institution
type

Payers
Institution
route

045_ReqPay_Txn_pur
pose

If(txn_type=PAY|COL
LECT|REFU
ND|REVERSAL|
DEBIT|CREDIT)

00|01|02
|03|04|0
5|06|07|
08|09|10

For mandate txn
also

come

cred block will

type="UPI-Mandate"

in
ReqPay(Debit)and RespAuthDetails for
IPS Mandate transactions.
<Cred
subType="DS">.
This institution block should contain all
the mandatory fields mentioned in the
ReqPay table.
This XML block will be applicable to
ReqPay & ReqAuthDetails.
Only these two modes of payment type
are admissible.

1. MTO- Money Transfer Operator
2. BANK

Drawing

Only these two modes of payment route
is admissible.
1.MTSS-Money transfer service scheme
2.RDA-Rupee
Arrangement
The purpose field is specially used for
00- DEFAULT
01- AMC
02- Travel
03- Hospitality
04- Hospital
05- Telecom

        Technical Specification Document                               242 | P a g e

046_ReqPay_Ac_addr
Type

If(addrType=ACCOU
N T|MOBILE|CARD
)

Account
values

047_ReqPay_Ac_nam
e_NationalID

If(addrType=AADHA
AR)

National ID
values

06- Insurance
07- Education
08- Gifting
09- Others

1.  If
    applicable for account + IFSC txn’s

addrType=ACCOUNT

is

If addrType=MOBILE is applicable

2.  for mobile banking txn’s

If addrType=CARD is applicable

3.  for card payments.
    If addrType=AADHAAR, then two below
    details are mandatory

048_ReqPay_Ac_nam
e_Account

If(addrType=ACCOU
NT)

Account
values

049_ReqPay_Ac_nam
e_Mobile

If(addrType=MOBILE
)

Mobile
values

050_ReqPay_Ac_nam
e_Card

If(addrType=CARD) Card

values

IIN= It should be 6-digit numeric
UIDNUM= It should be 11-digit numeric
assigned by UIDAI
If addrType=ACCOUNT,
below details are mandatory
IFSC= It should be 11-digit

three

then

alphanumeric
ACTYPE= It should be a fixed value
SAVINGS|DEFAULT|CURRE
NT|NRE|NRO|PPIWALLET|B
ANKWALLET|CREDIT|SOD| UOD
ACNUM= it should be max 30
Digits
If addrType=MOBILE, then two below
details are mandatory
9-digit mobile number
MMID=It should contain 7 digits
numeric.
If addrType=CARD, then the below
values are mandatory

ACTYPE= It should be a fixed value
SAVINGS|DEFAULT|CURRENT

CARDNUM=It should be Max- 16 digits
Numeric

        Technical Specification Document                               243 | P a g e

051*ReqPay_Amount*
Value

If(amount,orgAmou
nt,settamount)

Amount
value

The amount value should be numeric. It
should be populated
in the format
below.

2 digits should come after the decimal.

052_ReqPay_Txn_refC
ategory

If(txn_type=PAY|COL
LECT|REFU
ND|REVERSAL|
DEBIT|CREDIT)

00|01|02
|03|04|0
5|06|07|
08|09

For mandate txn
also

the category of

e.g., (Amount Value=”100.00”)
If refUrl is present, then refCatergory is
mandatory. The refCategory field is used
the
identify
to
transaction
00 -NULL
01 - Advertisement
02- Invoice
Others for future use
This tag consists of the Number on the
invoice printed or shared
the
customer.
This tag consists of the date on the
invoice printed or shared
the
customer

to

to

orgId will be provided to the participants
at the time of onboarding by IPS.
At the time of onboarding a three-
character code will be provided to the
participant that will be used while
forming the msgId or transaction id
Use always seqNum=1 irrespective of
payer or payee.

This field is used for specifying any
remarks or note for the transactions.
Participants may use this field to print on
the receipt.
This will be the website url for the sender
of the message.

1.  Wallet-Based Onboarding
    When the onboarding is based on a
    wallet, and the format used is FORMAT7,
    the detail name should be set to

            Technical Specification Document                               244 | P a g e

053_Payee.Mercha
nt.Invoice_num

054_Payee.Mercha
nt.Invoice_date

055_OrgId

056_seqNum

057_note

058_refUrl

059_Detail.name

MOBILE. This applies when the user is
accessing the service either through a
mobile application or via a feature phone
using the USSD channel. 2. National ID-Based Onboarding
For onboarding that uses a National ID,
and the format specified is FORMAT6,
This condition is applicable when the
user is accessing the service through a
mobile application. 3. Account-Based Onboarding
In
account-based
of
onboarding, the detail name should be
set to MOBILE | EXPDATE | CARDDIGITS.
This applies under two conditions:
3.1 When the user is using a mobile
application, and the format is FORMAT1.
3.2 When the user is using a feature
phone via USSD, and the format is
FORMAT2.

case

the

        Technical Specification Document                               245 | P a g e

6. Reference Request/Response Logs
The sample logs provided are for reference and illustration purposes only.
Note: The sample examples in the annexes do not include the digital signature because all APIs are signed using a signer certificate (IPS
Participant/SoV Provider/IPS). The sample logs are intended to help understand the API structure and field values, which is why the signature element
has been excluded.
If IPS Participant/SOV Provider (Initiating system) sends the request to IPS switch (destination system) it will sign the request from UPI like switch’s
public key and if IPS switch is sending request to IPS Participant/SoV Provider, it will sign the request from IPS Participant/SoV Provider public key.
Sample Log does not contain the Ack as logs are intended to help understand the API structure and field values, which is why the signature element
has been excluded.

However, a sample request that includes the digital signature is provided in Section 3.5 – Certificate Requirement.

6.1. HeartBeat
Refer Specifications Heartbeat API

Request:

<ReqHbt>
    <Head ver="2.0" ts="2025-06-03T12:39:25.510+02:00" orgId="700001" msgId="7000011748947165510"
prodType="UPI"/>
    <Txn id="7000011748947165510" note="Heart Beat Msg" refId="BARBE8F8C899A574886AECEB39151596F4F"
refUrl="http://lcodetechnologies.com/" ts="2025-06-03T12:39:25.510+02:00" type="Hbt"/>
    <HbtMsg type="ALIVE" value="NA"/>
</ReqHbt>

        Technical Specification Document                               246 | P a g e

Response:

<RespHbt>
    <Head ver="2.0" ts="2025-06-03T12:39:25+02:00" orgId="NPCI" msgId="1xysV832akKh" prodType="UPI"/>
    <Resp reqMsgId="7000011748947165510" result="SUCCESS"/>
    <Txn id="7000011748947165510" note="Heart Beat Msg" ts="2025-06-03T12:39:25+02:00" type="Hbt"
refId="BARBE8F8C899A574886AECEB39151596F4F" refUrl="http://lcodetechnologies.com/" />
</RespHbt>

List PSP

6.2.
Refer Specifications List PSP API

Request:

<ReqListPsp>

<Head ver="2.0" ts="2025-06-02T10:55:41+02:00" orgId="700001"
msgId="CNRebd1f8702193436493722c63660e203a" prodType="UPI" />
    <Txn id="MYSIM00000000001vRPtRTgqKswACfYgXyo" note="Listing PSPs"
        refId="CNRe6b6f56d66d24fc0aaf510862235a247" refUrl="http://psp.ref.test.com"
        ts="2017-01-23T14:24:12+05:30" type="ListPsp" />
</ReqListPsp>

Response:

<RespListPsp>
    <Head ver="2.0" ts="2025-06-02T10:55:41+02:00" orgId="NPCI" msgId="1xysV6fNQcLl" prodType="UPI" />
    <Resp reqMsgId="CNRebd1f8702193436493722c63660e203a" result="SUCCESS" />
    <Txn id="MYSIM00000000001vRPtRTgqKswACfYgXyo" note="Listing PSPs"
        refId="CNRe6b6f56d66d24fc0aaf510862235a247" refUrl="http://psp.ref.test.com"
        ts="2017-01-23T14:24:12+05:30" type="ListPsp" />
    <PspList>
        <Psp name="Mypsp" codes="mypsp,oksbi,okicici,okaxis" active="Y" url="http://127.0.0.1:30002"

        Technical Specification Document                               247 | P a g e

spocName="npciuser" spocEmail="npci@npci.org.in" spocPhone="1234567890"
lastModifedTs="2025-05-30T11:44:05+02:00">
<VersionSupported>
<Version no="2.0" description="ITS A 2.0 BASE VERSION" mandatory="true" />
</VersionSupported>
</Psp>
</PspList>
</RespListPsp>

List Account Providers

6.3.
Refer Specifications List Account Providers API

Request:

<ReqListAccPvd>
    <Head ver="2.0" ts="2025-06-02T11:04:51+02:00" orgId="700001"
        msgId="BARBB7FFC80252C4F2EAA6BEAD7B349094F" prodType="UPI" />
    <Txn id="MYSIM00000000001vRPtRTgqKswADe15dqo" note="Account provider Listing"
        refId="BARBE8F8C899A574886AECEB39151596F4F" refUrl="http://lcodetechnologies.com/"
        ts="2017-01-23T14:09:59+05:30" type="ListAccPvd" />
</ReqListAccPvd>

Response:

<RespListAccPvd>
    <Head ver="2.0" ts="2025-06-02T11:04:51+02:00" orgId="NPCI" msgId="1xysV6gySm1Z" prodType="UPI" />
    <Resp reqMsgId="BARBB7FFC80252C4F2EAA6BEAD7B349094F" result="SUCCESS" />
    <Txn id="MYSIM00000000001vRPtRTgqKswADe15dqo" note="Account provider Listing"
        refId="BARBE8F8C899A574886AECEB39151596F4F" refUrl="http://lcodetechnologies.com/"
        ts="2017-01-23T14:09:59+05:30" type="ListAccPvd" />
    <AccPvdList>

        Technical Specification Document                               248 | P a g e

<AccPvd name="Mypsp" iin="500001" ifsc="AABY0000382" active="Y" url="http://127.0.0.1:30002"
            spocName="npciuser" spocEmail="npci@npci.org.in" spocPhone="1234567890" prods="UPI"
            lastModifedTs="2025-05-30T11:44:05+02:00" mobRegFormat="FORMAT2">
<VersionSupported>
<Version no="2.0" description="ITS A 2.0 BASE VERSION" mandatory="true" />
</VersionSupported>
</AccPvd>
</AccPvdList>
</RespListAccPvd>

6.4.

List Keys

Refer Specifications List Keys API

For type=”ListKeys”

Request:

<ReqListKeys>
    <Head ver="2.0" ts="2025-06-02T11:14:36+02:00" orgId="700001"
        msgId="MYSIM00000000001vRPtRTgqKswAEfXXMnS" prodType="UPI" />
    <Txn id="MYSIM00000000001vRPtRTgqKswAEfXXMnS" note="List Keys"
        refId="1f92232e14811e685c6f998defba8a" refUrl="http://www.npci.org.in/"
        ts="2017-01-23T14:20:09+05:30" type="ListKeys" />
</ReqListKeys>

Response:

<RespListKeys>
    <Head ver="2.0" ts="2025-06-02T11:14:37+02:00" orgId="NPCI" msgId="1xysV6gCQeAz" prodType="UPI" />
    <Resp reqMsgId="MYSIM00000000001vRPtRTgqKswAEfXXMnS" result="SUCCESS" />
    <Txn id="MYSIM00000000001vRPtRTgqKswAEfXXMnS" note="List Keys"
        refId="1f92232e14811e685c6f998defba8a" refUrl="http://www.npci.org.in/"
        ts="2017-01-23T14:20:09+05:30" type="ListKeys" />

        Technical Specification Document                               249 | P a g e

<keyList>
<key code="NPCI" owner="NPCI" type="PKI" ki="20150822">
<keyValue>
NA|MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAuMKxWfy0WcPp98muBWa6yhpmb6ZGZGSKHRIOv05UlIN5TbUPl6yEerh7Wj0
+JyKfsOntRdAVhkLJGRoHwH6gEEeFNHge7kPea/B33cQAbqa39mnP5F1aaZT3tjJnKrfI1Wum0crdb7dAMzft4JILOEa+s3Uh7OdYEl/Xp
7EisdSoJ345Cj0LTfLZEQzRdVGovXZrfLByJysH11V9tDrIVv75C/3UndwjHt3NrqzNBoUMh5VZRFkcwuebUAkhIed5gvoysJwd0yYGrAU
XNrXJJDTAj5diCuasWyfWZR9lsX5l14hdxF+lqadR/pgII53DW5oEy2LMXgvt2u/qmSml8wIDAQAB

</keyValue>

        </key>
    </keyList>

</RespListKeys>

For type=”GetToken”

Request:
<ReqListKeys>
<Head ver="2.0" ts="2025-06-02T12:21:16+02:00" orgId="700001"
        msgId="MYSIM00000000001vRPtRTgqKswALiunyko" prodType="UPI" />
<Txn id="MYSIM00000000001vRPtRTgqKswALiunyko" note="List Keys"
        refId="1f92232e14811e685c6f998defba8a" refUrl="http://www.npci.org.in/"
        ts="2017-01-23T14:20:09+05:30" type="GetToken" />
<Creds>
<Cred type="Challenge" subType="initial">
<Data code="NPCI" ki="20150822">
000000000000002|org.npci.upi.maggi|993456789|PWxc4VegbL/KZiVlaWMD6Ds6/MeCFj+cFEHJjSXE2/qv+gvWbEUH7pzkknBed
GBWlt8hYfGsHIMw&#xd;K9LLMs1LVJr7wE5yn4dXcNTrnq4WGwGm9JETncaTCxR/vq0q3Cf2SxiwabdbQlNu4XrI0Vgt6KzD&#xd;wABpW
EP0uOQUM/pq1/dCUqmQaRo8L3JmblzQwnEk3o5jcAcinun0ugNwj3Bu3HldWkeha4XwIHDg&#xd;uFbBotTDovqlMdNN16wIE9EOpSd20v
p/Zd12S1xuREMUIRF3vjUlze8qVakKHBLHmeSGh3yDZuRg&#xd;ya85I9dmpNnK4BtcF9Y8duMsmrCeG3axgts/Dg==&#xd;

 </Data>

        </Cred>
    </Creds>

</ReqListKeys>

        Technical Specification Document                               250 | P a g e

Response:

<RespListKeys>
    <Head ver="2.0" ts="2025-06-02T12:21:16+02:00" orgId="NPCI" msgId="1xysV6hLdxEE" prodType="UPI" />
    <Resp reqMsgId="MYSIM00000000001vRPtRTgqKswALiunyko" result="SUCCESS" />
    <Txn id="MYSIM00000000001vRPtRTgqKswALiunyko" note="List Keys"
        refId="1f92232e14811e685c6f998defba8a" refUrl="http://www.npci.org.in/"
        ts="2017-01-23T14:20:09+05:30" type="GetToken" />
    <keyList>
        <key code="NPCI" owner="NPCI" type="CLF" ki="20150822">
            <keyValue>VBMKoz0lvtEDoaDaomYz4KD4SFMjrJpfxaboeGAj6mU=</keyValue>
        </key>
    </keyList>
</RespListKeys>

type=”ListPSPKeys”

Request:

<ReqListKeys>
    <Head ver="2.0" ts="2025-06-09T11:13:31+02:00" orgId="700001"
        msgId="MYSIM00000000001vRPtRTgqKswROVu1LsA" prodType="UPI" />
    <Txn id="MYSIM00000000001vRPtRTgqKswROVu1LsA" note="List Keys"
        refId="1f92232e14811e685c6f998defba8a" refUrl="http://www.npci.org.in/"
        ts="2017-01-23T14:20:09+05:30" type="ListPSPKeys" />
</ReqListKeys>

Response:

<RespListKeys>
    <Head ver="2.0" ts="2025-06-09T11:13:31+02:00" orgId="NPCI" msgId="1xysViAHrrM4" prodType="UPI" />
    <Resp reqMsgId="MYSIM00000000001vRPtRTgqKswROVu1LsA" result="SUCCESS" />
    <Txn id="MYSIM00000000001vRPtRTgqKswROVu1LsA" note="List Keys"
        refId="1f92232e14811e685c6f998defba8a" refUrl="http://www.npci.org.in/"
        ts="2017-01-23T14:20:09+05:30" type="ListPSPKeys" />

        Technical Specification Document                               251 | P a g e

<keyList>
<key code="700001" owner="NPCI" type="SIGNEDINTENT" ki="20250606">
<keyValue>
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAmVzLJ+0RUfVn6wh7hOpILl06WTvuV8jraL7zxA3UxW1SHWY3IDCNfNFAbFx7aK
pK9FXBpVPMi5Zup3Hl1zTfozFwz+9mtU5pPP7J2l+Uick4Ixwdpp2yyk+B+qOD1uEc1yI2OqyMXjAaOifPCc1otVttMlhOh2wY3LQ2qMwr
koL08MYNXos2nCnzrjhC8OpI93y8nho0D28zIVwV0whhCccr12k530ZJpmKvqTfiU+N4mKQeuawAtg80jUKvR6YUUYBc9G3Bx0luFH+LwM
UQNsBt9JVdepi3FjTKVWWRUouRWZXiua1vROEN/cDjTR0juPwZymmqRlUDB5vtpEi8HwIDAQAB</keyValue>
</key>
</keyList>
</RespListKeys>

6.5.

List Verified Address Entries

Refer Specifications List Verified Address Entries API

Request:

<ReqListVae>
    <Head ver="2.0" ts="2025-06-26T16:07:52+05:30" orgId="700001"
msgId="HPDSFVC4QOS7X1UGPY7JGUV555PL9T2C3QM" prodType="UPI" />
    <Txn id="MYSIM00000000005sp20iQPvjgQPLOp7Xy" refId="aaa" refUrl="http://www.abc.com" ts="2015-02-
16T22:02:35+05:30" note="List vae" type=”ListVae”/>
</ReqListVae>

Response:

<RespListVae>
    <Head ver="2.0" ts="2025-06-26T16:07:53+05:30" orgId="NPCI" msgId="4EZsCT3tG" prodType="UPI" />
    <Resp reqMsgId="HPDSFVC4QOS7X1UGPY7JGUV555PL9T2C3QM" result="SUCCESS"/>
    <Txn id="MYSIM00000000005sp20iQPvjgQPLOp7Xy" refId="aaa" refUrl="http://www.abc.com" ts="2015-02-
16T22:02:35+05:30" note="List vae" type=”ListVae”/>
    <VaeList>

        Technical Specification Document                               252 | P a g e

<Vae name="India0" addr="0jun@mypsp" logo="http://myurl.com/russia" url="http://myurl.com">
<key code="NPCI" type="PKI" ki="20201111">
<keyValue>MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE6BBQUnO+Z+gpO2BeLp/3vbllm5VC4UQ0+hh2/PGaxCa38FEzUjf3eNWOiySt
PFGK5x/PjZ0xrAj7KSzJyAxG5w==</keyValue>
</key>
</Vae>
</VaeList>
</ns2:RespListVae>

6.6.

List Account API

Refer Specifications List Account API

Request from Acquirer to IPS:

   <ReqListAccount>
    <Head ver="2.0" ts="2025-06-06T07:18:07+02:00" orgId="700001"
        msgId="IDF8D7DA2D2978542558A71C9B1AD0102C8" prodType="UPI"/>
    <Txn id="MYSIM00000000001vRPtRTgqKswK3ISYYhO" note="List Accounts" refId="112713671978"
        refUrl="http://www.idfcbank.com/" ts="2021-05-07T13:03:10+05:30" type="ListAccount" />
    <Payer addr="deviprd@mypsp" name="Devi" seqNum="1" type="PERSON" code="0000" aadhaarConsent="N">
        <Device>
            <Tag name="MOBILE" value="264812345" />
            <Tag name="GEOCODE" value="13.082680,80.270718" />
            <Tag name="LOCATION" value="MUMBAI" />
            <Tag name="IP" value="192.168.43.1" />
            <Tag name="TYPE" value="MOB" />
            <Tag name="ID" value="000000000000002" />
            <Tag name="OS" value="Android" />
            <Tag name="APP" value="org.npci.upi.maggi" />
            <Tag name="CAPABILITY" value="1000" />
        </Device>
        <Ac addrType="ACCOUNT">

        Technical Specification Document                               253 | P a g e

<Detail name="IFSC" value="AABY0000382" />
</Ac>
</Payer>
<Link type="MOBILE" value="264812345" />
</ReqListAccount>

Request from IPS to Issuer SOV Providers:

<ReqListAccount>
    <Head ver="2.0" ts="2025-06-06T07:18:07+02:00" orgId="NPCI" msgId="1xysVdeTS1OR" prodType="UPI" />
    <Txn id="MYSIM00000000001vRPtRTgqKswK3ISYYhO" note="List Accounts" refId="112713671978"
        refUrl="http://www.idfcbank.com/" ts="2021-05-07T13:03:10+05:30" type="ListAccount" />
    <Payer addr="deviprd@mypsp" name="Devi" seqNum="1" type="PERSON" code="0000" aadhaarConsent="N">
        <Device>
            <Tag name="MOBILE" value="264812345" />
            <Tag name="GEOCODE" value="13.082680,80.270718" />
            <Tag name="LOCATION" value="MUMBAI" />
            <Tag name="IP" value="192.168.43.1" />
            <Tag name="TYPE" value="MOB" />
            <Tag name="ID" value="000000000000002" />
            <Tag name="OS" value="Android" />
            <Tag name="APP" value="org.npci.upi.maggi" />
            <Tag name="CAPABILITY" value="1000" />
        </Device>
        <Ac addrType="ACCOUNT">
            <Detail name="IFSC" value="AABY0000382" />
        </Ac>
    </Payer>
    <Link type="MOBILE" value="264812345" />
</ReqListAccount>

        Technical Specification Document                               254 | P a g e

Response from Issuer SOV to IPS:

<RespListAccount>
    <Head ver="2.0" ts="2025-06-06T07:18:07.521+02:00" orgId="700001"
        msgId="XYA0000000000001vRPtRSgrisKTyXAGOlR" prodType="UPI" />
    <Resp reqMsgId="1xysVdeTS1OR" result="SUCCESS" />
    <Txn id="MYSIM00000000001vRPtRTgqKswK3ISYYhO" note="List Accounts" refId="112713671978"
        refUrl="http://www.google.co.in/" ts="2025-06-06T07:18:07.521+02:00" type="ListAccount" />
    <AccountList>
        <Account accType="SAVINGS" accRefNumber="117795514570123" maskedAccnumber="XXXXXXXXXX570123"
            ifsc="AABY0000382" mmid="3004010" name="ABC" aeba="Y" mbeba="Y" aadhaarNo="56789012346">

<CredsAllowed dLength="6" dType="Numeric" subType="SMS" type="OTP"/>

          <CredsAllowed dLength="6" dType="Numeric" subType="MPIN" type="PIN"/>
          <CredsAllowed dLength="6" dType="Numeric" subType="ATMPIN" type="PIN"/>

</Account>
<Account accType="WALLET" accRefNumber="123456789067890" maskedAccnumber="XXXXXXXXXX067890"
            ifsc="AABY0000367" mmid="3004010" name="BankA" aeba="N" mbeba="Y">

  <CredsAllowed dLength="6" dType="Numeric" subType="SMS" type="OTP"/>
          <CredsAllowed dLength="6" dType="Numeric" subType="MPIN" type="PIN"/>
          <CredsAllowed dLength="5" dType="Numeric" subType="WALLETPIN" type="PIN"/>
</Account>

    </AccountList>

</RespListAccount>

Response from IPS to Acquirer Participants:

<RespListAccount>
    <Head ver="2.0" ts="2025-06-06T07:18:07+02:00" orgId="NPCI" msgId="1xysVdeTS1OT" prodType="UPI" />
    <Resp reqMsgId="1xysVdeTS1OR" result="SUCCESS" />
    <Txn id="MYSIM00000000001vRPtRTgqKswK3ISYYhO" note="List Accounts" refId="1"
        refUrl="http://www.google.co.in/" ts="2025-06-06T07:18:07.521+02:00" type="ListAccount" />
    <AccountList>

        Technical Specification Document                               255 | P a g e

<Account accType="SAVINGS" accRefNumber="117795514570123" maskedAccnumber="XXXXXXXXXX570123"
            ifsc="AABY0000382" mmid="3004010" name="ABC" aeba="Y" mbeba="Y" >

<CredsAllowed dLength="6" dType="Numeric" subType="SMS" type="OTP"/>

          <CredsAllowed dLength="6" dType="Numeric" subType="MPIN" type="PIN"/>
          <CredsAllowed dLength="6" dType="Numeric" subType="ATMPIN" type="PIN"/>

   </Account>
    </AccountList>
</RespListAccount>

6.7.

Manage Verified Address Entries API

Refer Specifications Manage Verified Address Entries API

Request:

<ReqManageVae>

<Head ver="2.0" ts="2025-06-05T09:54:12+02:00" orgId="700001" msgId="5t0xf5rB2rA3if8ZGye"
prodType="UPI" />

    <Txn id="MYSIM00000000001vRPtRTgqKswHS6e61Es" note="Tran Note" refId="1"
        refUrl="http://www.google.co.in/" ts="2020-05-05T11:41:22+05:30" type="ManageVae" />
    <VaeList>
        <Vae op="ADD" name="India0" addr="0Feb@mypsp" logo="http://myurl.com/russia"
            url=http://myurl.com seqNum="1" >
            <key code="NPCI" type="PKI" ki="20201111">
                <keyValue>

MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE6BBQUnO+Z+gpO2BeLp/3vbllm5VC4UQ0+hh2/PGaxCa38FEzUjf3eNWOiyStPFGK5x/PjZ
0xrAj7KSzJyAxG5w==</keyValue>
</key>
</Vae>
</VaeList>
</ReqManageVae>

Response:

        Technical Specification Document                               256 | P a g e

<RespManageVae>
<Head ver="2.0" ts="2025-06-05T09:54:12+02:00" orgId="NPCI" msgId="1xysVbwainT4" prodType="UPI" />
<Txn id="MYSIM00000000001vRPtRTgqKswHS6e61Es" note="Tran Note" refId="1"
        refUrl="http://www.google.co.in/" ts="2020-05-05T11:41:22+05:30" type="ManageVae" />
<Resp reqMsgId="5t0xf5rB2rA3if8ZGye" result="SUCCESS">
<Ref op="ADD" seqNum="1" addr="0Feb@mypsp" respCode="00" result="SUCCESS" />
</Resp>
</RespManageVae>

6.8.

Validate Address

Refer Specifications Validate Address API

P2P:

Request from Payer IPS Payer participants to IPS:

<ReqValAdd>
    <Head ver="2.0" ts="2025-06-10T11:46:28+02:00" orgId="700002"
msgId="LVB2e9c06404a8d4b289dc24cdca9b0ad75" prodType="UPI"/>
    <Txn id="MYSIM00000000001vRPtRTgqKswUkw9OK4M" note="Validate vpa" refId="123456"
refUrl=https://upaay.lvbank.in ts="2019-03-29T14:41:48+05:30" type="ValAdd"
custRef="LVB60a39feff0214ee0a8c5c10cc2a6c0ff"/>
    <Payer addr="payer@mypsp2" name="Shyam" seqNum="1" type="PERSON" code="0000">
        <Info>
            <Identity type="PAN" verifiedName="Ram" id="SDF45645BJB22"/>
            <Rating verifiedAddress="TRUE"></Rating>
        </Info>
        <Device>
            <Tag name="MOBILE" value="993456789"/>
            <Tag name="TYPE" value="MOB"/>
            <Tag name="ID" value="000000000000002"/>
            <Tag name="OS" value="android"/>

        Technical Specification Document                               257 | P a g e

<Tag name="APP" value="org.npci.upi.maggi"/>
</Device>
</Payer>
<Payee addr="ree@mypsp2" seqNum="1"/>
</ReqValAdd>

Request from IPS to Payee IPS participants:

<ReqValAdd>
    <Head ver="2.0" ts="2025-06-10T11:46:28+02:00" orgId="NPCI" msgId="1xysVkm4oAd5" prodType="UPI"/>
    <Txn id="MYSIM00000000001vRPtRTgqKswUkw9OK4M" note="Validate vpa" refId="123456"
refUrl="https://upaay.lvbank.in"ts="2019-03-29T14:41:48+05:30" type="ValAdd"
custRef="LVB60a39feff0214ee0a8c5c10cc2a6c0ff"/>
    <Payer addr="payer@mypsp2" name="Shyam" seqNum="1" type="PERSON" code="0000">
        <Info>
            <Identity type="PAN" verifiedName="Ram" id="SDF45645BJB22"/>
            <Rating verifiedAddress="TRUE"></Rating>
        </Info>
        <Device>
            <Tag name="MOBILE" value="993456789"/>
            <Tag name="TYPE" value="MOB"/>
            <Tag name="ID" value="000000000000002"/>
            <Tag name="OS" value="android"/>
            <Tag name="APP" value="org.npci.upi.maggi"/>
        </Device>
    </Payer>
    <Payee addr="ree@mypsp2" seqNum="1"/>
</ReqValAdd>

Response from Payee IPS participants to IPS:

<RespValAdd>
    <Head ver="2.0" ts="2025-06-10T11:46:28.472+02:00" orgId="700002"
msgId="XYB0000000000001vRPtRSgrisL3PKRWb1T" prodType="UPI"/>

        Technical Specification Document                               258 | P a g e

<Resp reqMsgId="1xysVkm4oAd5" result="SUCCESS" errCode="" maskName="Narayanan" code="0000"
type="PERSON" IFSC="AABF0009009" IIN="500004" accType="SAVINGS" addr=”ree@mypsp2”/>
<Txn id="MYSIM00000000001vRPtRTgqKswUkw9OK4M" note="Validate vpa" refId="123456"
refUrl=https://upaay.lvbank.in ts="2019-03-29T14:41:48+05:30" type="ValAdd"
custRef="LVB60a39feff0214ee0a8c5c10cc2a6c0ff"/>
</RespValAdd>

Response from IPS to Payer IPS Participant:

<RespValAdd>
    <Head ver="2.0" ts="2025-06-10T11:46:28+02:00" orgId="NPCI" msgId="1xysVkm4oAd7" prodType="UPI"/>
    <Resp reqMsgId="LVB2e9c06404a8d4b289dc24cdca9b0ad75" result="SUCCESS" errCode=""
maskName="Narayanan" code="0000" type="PERSON" IFSC="AABF0009009" IIN="500004" accType="SAVINGS"
addr="ree@mypsp2"/>
    <Txn id="MYSIM00000000001vRPtRTgqKswUkw9OK4M" note="Validate vpa" refId="123456"
refUrl="https://upaay.lvbank.in"ts="2019-03-29T14:41:48+05:30" type="ValAdd"
custRef="LVB60a39feff0214ee0a8c5c10cc2a6c0ff"/>
</RespValAdd>

P2M:

Request from IPS Payer participants to IPS:

<ReqValAdd>
    <Head ver="2.0" ts="2025-06-06T09:00:41+02:00" orgId="700001"
        msgId="LVB2e9c06404a8d4b289dc24cdca9b0ad75" prodType="UPI" />
    <Txn id="MYSIM00000000001vRPtRTgqKswKeyCsuje" note="Validate vpa" refId="123456"
        refUrl="https://upaay.lvbank.in" ts="2019-03-29T14:41:48+05:30" type="ValAdd"
        custRef="LVB60a39feff0214ee0a8c5c10cc2a6c0ff" />
    <Payer addr="mapperchk@mypsp" name="asimg" seqNum="1" type="PERSON" code="0000">
        <Info>
            <Identity type="ACCOUNT" verifiedName="PALANIVEL K" id="1234567" />
            <Rating verifiedAddress="TRUE"></Rating>

        Technical Specification Document                               259 | P a g e

</Info>
<Device>
<Tag name="MOBILE" value="993456789" />
<Tag name="TYPE" value="MOB" />
<Tag name="ID" value="000000000000002" />
<Tag name="OS" value="android" />
<Tag name="APP" value="org.npci.upi.maggi" />
<Tag name="GEOCODE" value="22.5767335,88.4344541" />
<Tag name="LOCATION" value="9, Street Number 10, DN Block, Sector V," />
<Tag name="IP" value="10.22.205.176" />
<Tag name="CAPABILITY" value="100" />
</Device>
</Payer>
<Payee addr="merchant@mypsp" seqNum="1" />
</ReqValAdd>

Request from IPS to Payee IPS participants:

<ReqValAdd>
    <Head ver="2.0" ts="2025-06-06T09:00:41+02:00" orgId="NPCI" msgId="1xysVdgY8Wan" prodType="UPI" />
    <Txn id="MYSIM00000000001vRPtRTgqKswKeyCsuje" note="Validate vpa" refId="123456"
        refUrl="https://upaay.lvbank.in" ts="2019-03-29T14:41:48+05:30" type="ValAdd"
        custRef="LVB60a39feff0214ee0a8c5c10cc2a6c0ff" />
    <Payer addr="mapperchk@mypsp" name="asimg" seqNum="1" type="PERSON" code="0000">
        <Info>
            <Identity type="ACCOUNT" verifiedName="PALANIVEL K" id="123456" />
            <Rating verifiedAddress="TRUE"></Rating>
        </Info>
        <Device>
            <Tag name="MOBILE" value="993456789" />

        Technical Specification Document                               260 | P a g e

<Tag name="TYPE" value="MOB" />
<Tag name="ID" value="000000000000002" />
<Tag name="OS" value="android" />
<Tag name="APP" value="org.npci.upi.maggi" />
<Tag name="GEOCODE" value="22.5767335,88.4344541" />
<Tag name="LOCATION" value="9, Street Number 10, DN Block, Sector V," />
<Tag name="IP" value="10.22.205.176" />
<Tag name="CAPABILITY" value="100" />
</Device>
</Payer>
<Payee addr="merchant@mypsp" seqNum="1" />
</ReqValAdd>

Response from Payee IPS participants to IPS:

<RespValAdd>
    <Head ver="2.0" ts="2025-06-06T09:00:41.529+02:00" orgId="700001"
        msgId="XYA0000000000001vRPtRSgrisKTJNkpQUM" prodType="UPI" />
    <Resp reqMsgId="1xysVdgY8Wan" result="SUCCESS" errCode="" maskName="Narayanan" code="8931"
        type="ENTITY" IFSC="HDFC0009009" IIN="500001" accType="PPIWALLET" addr=” merchant@mypsp”>
        <Merchant>
            <Identifier subCode="1234" mid="8394" sid="2212" tid="0101" merchantType="SMALL" />
            <Name brand="AllianceFranche" legal="Reliance" franchise="LearnFrench" />
            <Ownership type="PRIVATE" />
        </Merchant>
    </Resp>
    <Txn id="MYSIM00000000001vRPtRTgqKswKeyCsuje" note="Validate vpa" refId="123456"
        refUrl="https://upaay.lvbank.in" ts="2019-03-29T14:41:48+05:30" type="ValAdd"
        custRef="LVB60a39feff0214ee0a8c5c10cc2a6c0ff" />
</RespValAdd>

Response from IPS to Payer IPS participants:

        Technical Specification Document                               261 | P a g e

<RespValAdd>
<Head ver="2.0" ts="2025-06-06T09:00:41+02:00" orgId="NPCI" msgId="1xysVdgY8Wap" prodType="UPI" />
<Resp reqMsgId="LVB2e9c06404a8d4b289dc24cdca9b0ad75" result="SUCCESS" errCode=""
        maskName="Narayanan" code="8931" type="ENTITY" IFSC="HDFC0009009" IIN="500001"
        accType="PPIWALLET" addr="merchant@mypsp">
<Merchant>
<Identifier subCode="1234" mid="8394" sid="2212" tid="0101" merchantType="SMALL" />
<Name brand="AllianceFranche" legal="Reliance" franchise="LearnFrench" />
<Ownership type="PRIVATE" />
</Merchant>
</Resp>
<Txn id="MYSIM00000000001vRPtRTgqKswKeyCsuje" note="Validate vpa" refId="123456"
        refUrl="https://upaay.lvbank.in" ts="2019-03-29T14:41:48+05:30" type="ValAdd"
        custRef="LVB60a39feff0214ee0a8c5c10cc2a6c0ff" />
</RespValAdd>

6.9. Set Credential API

Refer Specifications Set Credentials API

Request from IPS Participant to IPS:

<ReqSetCre>
    <Head ver="2.0" ts="2025-06-06T19:22:16+02:00" orgId="700001"
        msgId="XYD67c67aaded1f4e658ba0f7c14be13ce8" prodType="UPI" />
    <Txn id="MYSIM00000000001vRPtRTgqKswLidA2RKU" note="set credential"
        refId="XYD214e90075ade4d748e109ef54a07f39e" refUrl="http://www.rblbank.com"
        ts="2017-01-16T12:10:35+05:30" type="SetCre" />
    <Payer addr="popop@mypsp" name="Shubham  Lamba" seqNum="1" type="PERSON" code="0000">

        Technical Specification Document                               262 | P a g e

<Device>
<Tag name="GEOCODE" value="0.0,0.0" />
<Tag name="LOCATION" value="CHENNAI" />
<Tag name="IP" value="192.168.1.100" />
<Tag name="MOBILE" value="993456789" />
<Tag name="TYPE" value="MOB" />
<Tag name="ID" value="000000000000002" />
<Tag name="OS" value="android" />
<Tag name="APP" value="org.npci.upi.maggi" />
<Tag name="CAPABILITY" value="100" />
</Device>
<Ac addrType="ACCOUNT">
<Detail name="IFSC" value="AABY0000382" />
<Detail name="ACTYPE" value="SAVINGS" />

  <Detail name="ACNUM" value="1234567890" />

        </Ac>
        <Creds>
            <Cred type="PIN" subType="MPIN">
                <Data code="NPCI"

ki="20150822">2.0|g3qWFnPoaAF2MIMCWzp+DobYPq8gJ0bh7zsJ4kCW/IW2UKQjkOME9k5Nq54V6K7q5PyI478TSm0m&#xd;
BhxNnJ24lPy1UIjwdgbTdsO6AeYpWEq67s3FtCLkyzs0JH3xWVOLe7iQQjCaYQgHKE7w6XTqSu3i&#xd;
Ip5plYl62ZPmTLhPvhdx9FQlYo5bR0CUqhoJeFV7/ksfIFtYA4LqSMYuHX+fplZyH69Ukc6gJQM5&#xd;
6WZAtxdMurMUZ9u45yG0G6rn+GXY0ftVu1T/XD/QnK8DmVN6lSVRtY5p524ghBvXNkMSkdJtNEGb&#xd;
0K2efflfWM2O/o6OxtHQdyxTU+E4CH6NaY8K1w==&#xd;
</Data>
</Cred>
</Creds>
<NewCred>
<Cred type="PIN" subType="MPIN">
<Data code="NPCI"
ki="20150822">2.0|M0+2VuWzxTK4nBxSxfRFVxLSSDKmv6lJE8K+NZieJw5hBihXHmwxIejCEtVHQPQ2yKZfJ4ng1vrv&#xd;
7SuKqickhsVqDhdBpM6OrxquFVN9RgKFel/3ZGxibj11v3ImZdV1R0OInYtHBuof4yvIaDB0M9Nq&#xd;
s+QMzw52OwzSco4m2yM4r3JwLG0rgO6G47+s7yu4dbKnEc6p7Oc+FE9k8uhnnK+fo15N+4xnslvC&#xd;
1Z+8fhYxe+ugsGHHpqXTzQk4YB317BWEszsXYHBi6RoikAoIUtq7KDsmyXN4j+/feoNVims+8nP2&#xd;
/zAbEYsWcJ4r3Jl+XjN3Oa/Dt7oRbt6WoOK0Sw==&#xd;

        Technical Specification Document                               263 | P a g e

</Data>
</Cred>
</NewCred>
</Payer>
</ReqSetCre>

Request from IPS to Issuer Participants:

<ReqSetCre>
    <Head ver="2.0" ts="2025-06-06T19:22:16+02:00" orgId="NPCI" msgId="1xysVds1FiGF" prodType="UPI"
/>
    <Txn id="MYSIM00000000001vRPtRTgqKswLidA2RKU" note="set credential"
        refId="XYD214e90075ade4d748e109ef54a07f39e" refUrl="http://www.rblbank.com"
        ts="2017-01-16T12:10:35+05:30" type="SetCre" />
    <Payer addr="popop@mypsp" name="Shubham  Lamba" seqNum="1" type="PERSON" code="0000">
        <Device>
            <Tag name="GEOCODE" value="0.0,0.0" />
            <Tag name="LOCATION" value="CHENNAI" />
            <Tag name="IP" value="192.168.1.100" />
            <Tag name="MOBILE" value="993456789" />
            <Tag name="TYPE" value="MOB" />
            <Tag name="ID" value="000000000000002" />
            <Tag name="OS" value="android" />
            <Tag name="APP" value="org.npci.upi.maggi" />
            <Tag name="CAPABILITY" value="100" />
        </Device>
        <Ac addrType="ACCOUNT">
            <Detail name="IFSC" value="AABY0000382" />
            <Detail name="ACTYPE" value="SAVINGS" />
        </Ac>
        <Creds>
            <Cred type="PIN" subType="MPIN">
                <Data code="700001" ki="20160217">MYSIM00000000001vRPtRTgqKswLidA2RKU</Data>
            </Cred>

        Technical Specification Document                               264 | P a g e

</Creds>
<NewCred>
<Cred type="PIN" subType="MPIN">
<Data code="700001" ki="20160217">MYSIM00000000001vRPtRTgqKswLidA2RKU</Data>
</Cred>
</NewCred>
</Payer>
</ReqSetCre>

Response from Issuer Participant to IPS:

<RespSetCre>
    <Head ver="2.0" ts="2025-06-06T19:22:16.900+02:00" orgId="700001"
        msgId="XYA0000000000001vRPtRSgrisKUNshJrMm" prodType="UPI" />
    <Resp reqMsgId="1xysVds1FiGF" result="SUCCESS" />
    <Txn id="MYSIM00000000001vRPtRTgqKswLidA2RKU" note="set credential"
        refId="XYD214e90075ade4d748e109ef54a07f39e" refUrl="http://www.rblbank.com"
        ts="2017-01-16T12:10:35+05:30" type="SetCre" />
</RespSetCre>

Response from IPS to Payer IPS Participants:

<RespSetCre>
    <Head ver="2.0" ts="2025-06-06T19:22:16+02:00" orgId="NPCI" msgId="1xysVds1FiGH" prodType="UPI"
/>
    <Resp reqMsgId="XYD67c67aaded1f4e658ba0f7c14be13ce8" result="SUCCESS" />
    <Txn id="MYSIM00000000001vRPtRTgqKswLidA2RKU" note="set credential"
        refId="XYD214e90075ade4d748e109ef54a07f39e" refUrl="http://www.rblbank.com"
        ts="2017-01-16T12:10:35+05:30" type="SetCre" />
</RespSetCre>

        Technical Specification Document                               265 | P a g e

6.10. Mobile Banking Registration API

Refer Specifications Mobile Banking Registration API

6.10.1.1. Registration through Debit card for Mobile APP

Request from IPS Payer Participants to IPS:

<ReqRegMob>
    <Head ver="2.0" ts="2025-06-03T09:12:07+02:00" orgId="700001"
        msgId="INDFFF5AA5B9EBF48C5B90DBB0A6BDB3D40" prodType="UPI" />
    <Txn id="MYSIM00000000001vRPtRTgqKswCTqFV7DG" note="Mobile registration" refId="21380"
        refUrl="http://www.npci.org.in" ts="2017-01-15T12:32:04.258+05:30" type="ReqRegMob" />
    <Payer addr="shruti@mypsp" name="2547BAU" seqNum="1" type="PERSON" code="0000" >
        <Device>
            <Tag name="GEOCODE" value="0.0 ,0.0 " />
            <Tag name="LOCATION" value="Mumbai" />
            <Tag name="IP" value="172.16.50.65" />
            <Tag name="MOBILE" value="993456789" />
            <Tag name="TYPE" value="MOB" />
            <Tag name="ID" value="000000000000002" />
            <Tag name="OS" value="android" />
            <Tag name="APP" value="org.npci.upi.maggi" />
            <Tag name="CAPABILITY" value="5200000200010004000639292929292" />
        </Device>
        <Ac addrType="ACCOUNT">
            <Detail name="IFSC" value="AABY0000382" />
            <Detail name="ACTYPE" value="SAVINGS" />
            <Detail name="ACNUM" value="10001105827" />

        Technical Specification Document                               266 | P a g e

</Ac>
</Payer>
<RegDetails type="FORMAT2">
<Creds>

 <Cred type="CARD" subType="CARDDETAILS">

                <Data code="NPCI"

ki="20150822">1.0|Yn80P37ju1W4ZU8jdN3v0kLNI+j8Go4JUP1kfDsAG6dehcaNg+3yx70JVS/5p4V/mx3UeMrNSyU/&#xd;
65ALfl0ltmCJW/hGQK6ajeZawxeMQRc5gRVlrcTopnUA05GhPQqJKZ7TFwR33V0+8p0Uht1E2/5i&#xd;
zsJSvjYp6UDt1zsiqN85WEfAGlueQeE1Ka+JZIXr7X2Uv8gWTY7F8L79DAyybdmWRkcZtqJERt5h&#xd;
oECmlNX5khKqg8y2yzc8zZenWNDtOFVXnWhs9snWd0pHdmKx/noH4KYNwbiY4DwFgBWju45z4eEi&#xd;
lT/b5k6X8KoRM/B987jrfmlTvtZ472X7fzFiHg==&#xd;
</Data>
</Cred>
<Cred type="OTP" subType="SMS">
<Data code="NPCI"
ki="20150822">1.0|Yn80P37ju1W4ZU8jdN3v0kLNI+j8Go4JUP1kfDsAG6dehcaNg+3yx70JVS/5p4V/mx3UeMrNSyU/&#xd;
65ALfl0ltmCJW/hGQK6ajeZawxeMQRc5gRVlrcTopnUA05GhPQqJKZ7TFwR33V0+8p0Uht1E2/5i&#xd;
zsJSvjYp6UDt1zsiqN85WEfAGlueQeE1Ka+JZIXr7X2Uv8gWTY7F8L79DAyybdmWRkcZtqJERt5h&#xd;
oECmlNX5khKqg8y2yzc8zZenWNDtOFVXnWhs9snWd0pHdmKx/noH4KYNwbiY4DwFgBWju45z4eEi&#xd;
lT/b5k6X8KoRM/B987jrfmlTvtZ472X7fzFiHg==&#xd;
</Data>
</Cred>
<Cred type="PIN" subType="MPIN">
<Data code="NPCI"
ki="20150822">1.0|UKhAVOuG3dm48vIA86yhI8T6HpRLCnJW0QIq7IK8osjtH6CUea4zCBbHQu5ozPdNyKImKuYgPjOf&#xd;
QnTWOfRRnuRqPZu0badpz1qNtln1BVoXJn7pFtLAAc1G8EvMANIX0pcVfkOLrQTsA0l0O41gXMEu&#xd;
Vymp2226SMrVtVrjvr54ZCITcrWu6xmUI6usQPvy6GwdbaV84ZSqBE65Lgs8u9qPpf2a9GYIGSxA&#xd;
6xe36nCD7nRqpV2HeZbxYm6gr5LnFwUmOP+lDDODejbyvyTCmldKDie9JaAltlZdeT8J0umYxn0K&#xd;
iUX5OMzDvOLFYGY1h3be8DiEdEy3wnUSfZOJrg==&#xd;
</Data>
</Cred>
<Cred type="PIN" subType="ATMPIN">
<Data code="NPCI"
ki="20150822">1.0|JLG6vtI49VTNnLy9DVs+vt73EzO5nvp7KFTrJb/voRnboli6EjAG5yTq6hNLgLWSfvEbsPD09Y0W&#xd;
S65oALvbvTxi+Wia1cskxX1F+lDDyIW9T1TzT+7uRy+NNzYSW+E3sX/d3Tjfl9wJkPCPLuq2KU3m&#xd;

        Technical Specification Document                               267 | P a g e

ZEMHgsG4PD0MFxBcmzAOQGXOA+e2FvZUfHe78eL+4R4LZg8O8H8pxC0MV/gWLa5MqCsxZw/nQ9UL&#xd;
WykvClaKpSjXtan8xP16sZDK41y/obPukvw1XLiYJ1b0pIVC89IDcmeKgZ5mAH3NWmhQvFmZ1irT&#xd;
f+d0Ovr41F3ahMAPU8nP2YY/k803PC/iwQWdQQ==&#xd;
</Data>
</Cred>
</Creds>
</RegDetails>
</ReqRegMob>

Request from IPS to Issuer IPS Participant:

<ReqRegMob>
    <Head ver="2.0" ts="2025-06-03T09:12:07+02:00" orgId="NPCI" msgId="1xysV7ZA3loG" prodType="UPI"
/>
    <Txn id="MYSIM00000000001vRPtRTgqKswCTqFV7DG" note="Mobile registration" refId="21380"
        refUrl="http://www.npci.org.in" ts="2017-01-15T12:32:04.258+05:30" type="ReqRegMob" />
    <Payer addr="shruti@mypsp" name="2547BAU" seqNum="1" type="PERSON" code="0000">
        <Device>
            <Tag name="GEOCODE" value="0.0 ,0.0 " />
            <Tag name="LOCATION" value="Mumbai" />
            <Tag name="IP" value="172.16.50.65" />
            <Tag name="MOBILE" value="993456789" />
            <Tag name="TYPE" value="MOB" />
            <Tag name="ID" value="000000000000002" />
            <Tag name="OS" value="android" />
            <Tag name="APP" value="org.npci.upi.maggi" />
            <Tag name="CAPABILITY" value="5200000200010004000639292929292" />
        </Device>
        <Ac addrType="ACCOUNT">
            <Detail name="IFSC" value="AABY0000382" />
            <Detail name="ACTYPE" value="SAVINGS" />
            <Detail name="ACNUM" value="10001105827" />

        Technical Specification Document                               268 | P a g e

</Ac>
</Payer>
<RegDetails type="FORMAT2">
<Detail name="MOBILE" value="993456789" />
<Detail name="CARDDIGITS" value="074519" />
<Detail name="EXPDATE" value="0923" />
<Creds>

   <Cred type="CARD" subType="CARDDETAILS">

<Data code="" ki="">base-64 encoded/encrypted authentication data </Data>

   </Cred>

            <Cred type="OTP" subType="SMS">
                <Data code="700001" ki="20160218">MYSIM00000000001vRPtRTgqKswCTqFV7DG</Data>
            </Cred>
            <Cred type="PIN" subType="MPIN">
                <Data code="700001" ki="20160218">MYSIM00000000001vRPtRTgqKswCTqFV7DG</Data>
            </Cred>
            <Cred type="PIN" subType="ATMPIN">
                <Data code="700001" ki="20160218">MYSIM00000000001vRPtRTgqKswCTqFV7DG</Data>
            </Cred>
        </Creds>
    </RegDetails>

</ReqRegMob>

Response from Issuer Participant to IPS:

<RespRegMob>
    <Head ver="2.0" ts="2025-06-03T09:12:07.713+02:00" orgId="700001"
        msgId="XYA0000000000001vRPtRSgrisKMoFo7ALE" prodType="UPI" />
    <Resp reqMsgId="1xysV7ZA3loG" result="SUCCESS" />
    <Txn id="MYSIM00000000001vRPtRTgqKswCTqFV7DG" note="Mobile registration" refId="21380"
        refUrl="http://www.npci.org.in" ts="2017-01-15T12:32:04.258+05:30" type="ReqRegMob" />
</RespRegMob>

        Technical Specification Document                               269 | P a g e

Response from IPS-to-IPS Participant:

<RespRegMob>
    <Head ver="2.0" ts="2025-06-03T09:12:07+02:00" orgId="NPCI" msgId="1xysV7ZA3loI" prodType="UPI"
/>
    <Resp reqMsgId="INDFFF5AA5B9EBF48C5B90DBB0A6BDB3D40" result="SUCCESS" />
    <Txn id="MYSIM00000000001vRPtRTgqKswCTqFV7DG" note="Mobile registration" refId="21380"
        refUrl="http://www.npci.org.in" ts="2017-01-15T12:32:04.258+05:30" type="ReqRegMob" />
</RespRegMob>

6.10.1.2. Registration through Debit card for USSD

Request from IPS Payer Participants to IPS:

<ReqRegMob>
    <Head ver="2.0" ts="2025-06-03T09:12:07+02:00" orgId="700001"
        msgId="INDFFF5AA5B9EBF48C5B90DBB0A6BDB3D40" prodType="UPI" />
    <Txn id="MYSIM00000000001vRPtRTgqKswCTqFV7DG" note="Mobile registration" refId="21380"
        refUrl="http://www.npci.org.in" ts="2017-01-15T12:32:04.258+05:30" type="ReqRegMob" />
    <Payer addr="shruti@mypsp" name="2547BAU" seqNum="1" type="PERSON" code="0000" >
        <Device>

  <Tag name="MOBILE" value="993456789" />

            <Tag name="TYPE" value="USDC" />
            <Tag name="GEOCODE" value="0.00,0.00" />
            <Tag name="ID" value="993456789" />
            <Tag name="APP" value="com.nuup" />
            <Tag name="TELECOM" value="Airtel" />
       </Device>
        <Ac addrType="ACCOUNT">
            <Detail name="IFSC" value="AABY0000382" />
            <Detail name="ACTYPE" value="SAVINGS" />

        Technical Specification Document                               270 | P a g e

<Detail name="ACNUM" value="10001105827" />
</Ac>
</Payer>
<RegDetails type="FORMAT1">
<Detail name="CARDDIGITS" value="062127" />
<Detail name="EXPDATE" value="1026" />
<Detail name="MOBILE" value="918235966651" />
<Creds>
<Cred type="PIN" subType="MPIN"><Data code="NPCI"
ki="20150822">2.0|WeSW67QUmdNPHYilTUE2ymrBoMSsASc5Rg/R6/iX+44d1wOnanoOIX9gFKi/HCez6zBb2AuXxS1ugsoYJ+G
Pyp+wabrj+Nr5emKNKgs1QXczetOSOF1ptZ+2A8SQiTkJf/QfUd5YjYS6K/evs5qFFZ6iri4NzdtGDzi3URT6/IB1ixMl4k8fyxgT
3uSrq2pZKAGeZXlq1C7k3spTgup6Ntn6dn75GiqvAUw6Qii1vs/CEok6PQkYopWRBbk3JGj7lEC+9SCt25YJkEnjocuB4+q2f/Qj9
yFhh9hJAbzm9C1Heghif+4VWB27095cR0Gqm4Mx1ZL1+MQlcBXWFhRy5g==</Data>
</Cred>
</Creds>
</RegDetails>
</ReqRegMob>

Request from IPS to Issuer IPS Participant:

<ReqRegMob>
    <Head ver="2.0" ts="2025-06-03T09:12:07+02:00" orgId="NPCI" msgId="1xysV7ZA3loG" prodType="UPI"
/>
    <Txn id="MYSIM00000000001vRPtRTgqKswCTqFV7DG" note="Mobile registration" refId="21380"
        refUrl="http://www.npci.org.in" ts="2017-01-15T12:32:04.258+05:30" type="ReqRegMob" />
    <Payer addr="shruti@mypsp" name="2547BAU" seqNum="1" type="PERSON" code="0000">
        <Device>

  <Tag name="MOBILE" value="993456789" />

            <Tag name="TYPE" value="USDC" />
            <Tag name="GEOCODE" value="0.00,0.00" />
            <Tag name="ID" value="993456789" />
            <Tag name="APP" value="com.nuup" />

        Technical Specification Document                               271 | P a g e

<Tag name="TELECOM" value="Airtel" />
</Device>
<Ac addrType="ACCOUNT">
<Detail name="IFSC" value="AABY0000382" />
<Detail name="ACTYPE" value="SAVINGS" />
<Detail name="ACNUM" value="10001105827" />
</Ac>
</Payer>
<RegDetails type="FORMAT1">
<Detail name="CARDDIGITS" value="062127" />
<Detail name="EXPDATE" value="1026" />
<Detail name="MOBILE" value="918235966651" />
<Creds>
<Cred type="PIN" subType="MPIN">

<Data code="NPCI"
ki="20150822">2.0|WeSW67QUmdNPHYilTUE2ymrBoMSsASc5Rg/R6/iX+44d1wOnanoOIX9gFKi/HCez6zBb
2AuXxS1ugsoYJ+GPyp+wabrj+Nr5emKNKgs1QXczetOSOF1ptZ+2A8SQiTkJf/QfUd5YjYS6K/evs5qFFZ6iri
4NzdtGDzi3URT6/IB1ixMl4k8fyxgT3uSrq2pZKAGeZXlq1C7k3spTgup6Ntn6dn75GiqvAUw6Qii1vs/CEok6
PQkYopWRBbk3JGj7lEC+9SCt25YJkEnjocuB4+q2f/Qj9yFhh9hJAbzm9C1Heghif+4VWB27095cR0Gqm4Mx1Z
L1+MQlcBXWFhRy5g==</Data>

            </Cred>
        </Creds>
    </RegDetails>

</ReqRegMob>

Response from Issuer Participant to IPS:

<RespRegMob>
    <Head ver="2.0" ts="2025-06-03T09:12:07.713+02:00" orgId="700001"
        msgId="XYA0000000000001vRPtRSgrisKMoFo7ALE" prodType="UPI" />
    <Resp reqMsgId="1xysV7ZA3loG" result="SUCCESS" />
    <Txn id="MYSIM00000000001vRPtRTgqKswCTqFV7DG" note="Mobile registration" refId="21380"
        refUrl="http://www.npci.org.in" ts="2017-01-15T12:32:04.258+05:30" type="ReqRegMob" />
</RespRegMob>

        Technical Specification Document                               272 | P a g e

Response from IPS-to-IPS Participant:

<RespRegMob>
    <Head ver="2.0" ts="2025-06-03T09:12:07+02:00" orgId="NPCI" msgId="1xysV7ZA3loI" prodType="UPI"
/>
    <Resp reqMsgId="INDFFF5AA5B9EBF48C5B90DBB0A6BDB3D40" result="SUCCESS" />
    <Txn id="MYSIM00000000001vRPtRTgqKswCTqFV7DG" note="Mobile registration" refId="21380"
        refUrl="http://www.npci.org.in" ts="2017-01-15T12:32:04.258+05:30" type="ReqRegMob" />
</RespRegMob>

6.10.1.3. Registration through Wallet PIN using APP

Request from IPS Payer Participants to IPS:

<ReqRegMob>
    <Head ver="2.0" ts="2025-06-03T09:12:07+02:00" orgId="700001"
        msgId="INDFFF5AA5B9EBF48C5B90DBB0A6BDB3D40" prodType="UPI" />
    <Txn id="MYSIM00000000001vRPtRTgqKswCTqFV7DG" note="Mobile registration" refId="21380"
        refUrl="http://www.npci.org.in" ts="2017-01-15T12:32:04.258+05:30" type="ReqRegMob" />
    <Payer addr="shruti@mypsp" name="2547BAU" seqNum="1" type="PERSON" code="0000" >
        <Device>
            <Tag name="GEOCODE" value="0.0 ,0.0 " />
            <Tag name="LOCATION" value="Mumbai" />
            <Tag name="IP" value="172.16.50.65" />
            <Tag name="MOBILE" value="8235966651" />
            <Tag name="TYPE" value="MOB" />
            <Tag name="ID" value="000000000000002" />
            <Tag name="OS" value="android" />
            <Tag name="APP" value="org.npci.upi.maggi" />
            <Tag name="CAPABILITY" value="5200000200010004000639292929292" />

        Technical Specification Document                               273 | P a g e

</Device>
<Ac addrType="ACCOUNT">
<Detail name="IFSC" value="AABY0000382" />
<Detail name="ACTYPE" value="WALLET" />
<Detail name="ACNUM" value="8235966651" />
</Ac>
</Payer>
<RegDetails type="FORMAT7">

<Detail name="MOBILE" value="8235966651" />

        <Creds>

<Cred type="OTP" subType="SMS">

                <Data code="NPCI"

ki="20150822">1.0|Yn80P37ju1W4ZU8jdN3v0kLNI+j8Go4JUP1kfDsAG6dehcaNg+3yx70JVS/5p4V/mx3UeMrNSyU/&#xd;
65ALfl0ltmCJW/hGQK6ajeZawxeMQRc5gRVlrcTopnUA05GhPQqJKZ7TFwR33V0+8p0Uht1E2/5i&#xd;
zsJSvjYp6UDt1zsiqN85WEfAGlueQeE1Ka+JZIXr7X2Uv8gWTY7F8L79DAyybdmWRkcZtqJERt5h&#xd;
oECmlNX5khKqg8y2yzc8zZenWNDtOFVXnWhs9snWd0pHdmKx/noH4KYNwbiY4DwFgBWju45z4eEi&#xd;
lT/b5k6X8KoRM/B987jrfmlTvtZ472X7fzFiHg==&#xd;
</Data>
</Cred>
<Cred type="PIN" subType="MPIN">
<Data code="NPCI"
ki="20150822">1.0|UKhAVOuG3dm48vIA86yhI8T6HpRLCnJW0QIq7IK8osjtH6CUea4zCBbHQu5ozPdNyKImKuYgPjOf&#xd;
QnTWOfRRnuRqPZu0badpz1qNtln1BVoXJn7pFtLAAc1G8EvMANIX0pcVfkOLrQTsA0l0O41gXMEu&#xd;
Vymp2226SMrVtVrjvr54ZCITcrWu6xmUI6usQPvy6GwdbaV84ZSqBE65Lgs8u9qPpf2a9GYIGSxA&#xd;
6xe36nCD7nRqpV2HeZbxYm6gr5LnFwUmOP+lDDODejbyvyTCmldKDie9JaAltlZdeT8J0umYxn0K&#xd;
iUX5OMzDvOLFYGY1h3be8DiEdEy3wnUSfZOJrg==&#xd;
</Data>
</Cred>
<Cred type="PIN" subType="WALLETPIN">
<Data code="NPCI"
ki="20150822">1.0|JLG6vtI49VTNnLy9DVs+vt73EzO5nvp7KFTrJb/voRnboli6EjAG5yTq6hNLgLWSfvEbsPD09Y0W&#xd;
S65oALvbvTxi+Wia1cskxX1F+lDDyIW9T1TzT+7uRy+NNzYSW+E3sX/d3Tjfl9wJkPCPLuq2KU3m&#xd;
ZEMHgsG4PD0MFxBcmzAOQGXOA+e2FvZUfHe78eL+4R4LZg8O8H8pxC0MV/gWLa5MqCsxZw/nQ9UL&#xd;
WykvClaKpSjXtan8xP16sZDK41y/obPukvw1XLiYJ1b0pIVC89IDcmeKgZ5mAH3NWmhQvFmZ1irT&#xd;
f+d0Ovr41F3ahMAPU8nP2YY/k803PC/iwQWdQQ==&#xd;

        Technical Specification Document                               274 | P a g e

</Data>
</Cred>
</Creds>
</RegDetails>
</ReqRegMob>

Request from IPS to Issuer IPS Participant:

<ReqRegMob>
    <Head ver="2.0" ts="2025-06-03T09:12:07+02:00" orgId="NPCI" msgId="1xysV7ZA3loG" prodType="UPI" />
    <Txn id="MYSIM00000000001vRPtRTgqKswCTqFV7DG" note="Mobile registration" refId="21380"
        refUrl="http://www.npci.org.in" ts="2017-01-15T12:32:04.258+05:30" type="ReqRegMob" />
    <Payer addr="shruti@mypsp" name="2547BAU" seqNum="1" type="PERSON" code="0000">
        <Device>
            <Tag name="GEOCODE" value="0.0 ,0.0 " />
            <Tag name="LOCATION" value="Mumbai" />
            <Tag name="IP" value="172.16.50.65" />
            <Tag name="MOBILE" value="8235966651" />
            <Tag name="TYPE" value="MOB" />
            <Tag name="ID" value="000000000000002" />
            <Tag name="OS" value="android" />
            <Tag name="APP" value="org.npci.upi.maggi" />
            <Tag name="CAPABILITY" value="5200000200010004000639292929292" />
        </Device>
        <Ac addrType="ACCOUNT">
            <Detail name="IFSC" value="AABY0000382" />
            <Detail name="ACTYPE" value="WALLET" />
            <Detail name="ACNUM" value="8235966651" />
        </Ac>
    </Payer>
    <RegDetails type="FORMAT7">

<Detail name="MOBILE" value="8235966651"/>

        Technical Specification Document                               275 | P a g e

<Creds>

<Cred type="OTP" subType="SMS">

                <Data code="NPCI"

ki="20150822">1.0|Yn80P37ju1W4ZU8jdN3v0kLNI+j8Go4JUP1kfDsAG6dehcaNg+3yx70JVS/5p4V/mx3UeMrNSyU/&#xd;
65ALfl0ltmCJW/hGQK6ajeZawxeMQRc5gRVlrcTopnUA05GhPQqJKZ7TFwR33V0+8p0Uht1E2/5i&#xd;
zsJSvjYp6UDt1zsiqN85WEfAGlueQeE1Ka+JZIXr7X2Uv8gWTY7F8L79DAyybdmWRkcZtqJERt5h&#xd;
oECmlNX5khKqg8y2yzc8zZenWNDtOFVXnWhs9snWd0pHdmKx/noH4KYNwbiY4DwFgBWju45z4eEi&#xd;
lT/b5k6X8KoRM/B987jrfmlTvtZ472X7fzFiHg==&#xd;
</Data>
</Cred>
<Cred type="PIN" subType="MPIN">
<Data code="NPCI"
ki="20150822">1.0|UKhAVOuG3dm48vIA86yhI8T6HpRLCnJW0QIq7IK8osjtH6CUea4zCBbHQu5ozPdNyKImKuYgPjOf&#xd;
QnTWOfRRnuRqPZu0badpz1qNtln1BVoXJn7pFtLAAc1G8EvMANIX0pcVfkOLrQTsA0l0O41gXMEu&#xd;
Vymp2226SMrVtVrjvr54ZCITcrWu6xmUI6usQPvy6GwdbaV84ZSqBE65Lgs8u9qPpf2a9GYIGSxA&#xd;
6xe36nCD7nRqpV2HeZbxYm6gr5LnFwUmOP+lDDODejbyvyTCmldKDie9JaAltlZdeT8J0umYxn0K&#xd;
iUX5OMzDvOLFYGY1h3be8DiEdEy3wnUSfZOJrg==&#xd;
</Data>
</Cred>
<Cred type="PIN" subType="WALLETPIN">
<Data code="NPCI"
ki="20150822">1.0|JLG6vtI49VTNnLy9DVs+vt73EzO5nvp7KFTrJb/voRnboli6EjAG5yTq6hNLgLWSfvEbsPD09Y0W&#xd;
S65oALvbvTxi+Wia1cskxX1F+lDDyIW9T1TzT+7uRy+NNzYSW+E3sX/d3Tjfl9wJkPCPLuq2KU3m&#xd;
ZEMHgsG4PD0MFxBcmzAOQGXOA+e2FvZUfHe78eL+4R4LZg8O8H8pxC0MV/gWLa5MqCsxZw/nQ9UL&#xd;
WykvClaKpSjXtan8xP16sZDK41y/obPukvw1XLiYJ1b0pIVC89IDcmeKgZ5mAH3NWmhQvFmZ1irT&#xd;
f+d0Ovr41F3ahMAPU8nP2YY/k803PC/iwQWdQQ==&#xd;
</Data>
</Cred>
</Creds>
</RegDetails>
</ReqRegMob>

        Technical Specification Document                               276 | P a g e

Response from Issuer Participant to IPS:

<RespRegMob>
    <Head ver="2.0" ts="2025-06-03T09:12:07.713+02:00" orgId="700001"
        msgId="XYA0000000000001vRPtRSgrisKMoFo7ALE" prodType="UPI" />
    <Resp reqMsgId="1xysV7ZA3loG" result="SUCCESS" />
    <Txn id="MYSIM00000000001vRPtRTgqKswCTqFV7DG" note="Mobile registration" refId="21380"
        refUrl="http://www.npci.org.in" ts="2017-01-15T12:32:04.258+05:30" type="ReqRegMob" />
</RespRegMob>

Response from IPS-to-IPS Participant:

<RespRegMob>
    <Head ver="2.0" ts="2025-06-03T09:12:07+02:00" orgId="NPCI" msgId="1xysV7ZA3loI" prodType="UPI" />
    <Resp reqMsgId="INDFFF5AA5B9EBF48C5B90DBB0A6BDB3D40" result="SUCCESS" />
    <Txn id="MYSIM00000000001vRPtRTgqKswCTqFV7DG" note="Mobile registration" refId="21380"
        refUrl="http://www.npci.org.in" ts="2017-01-15T12:32:04.258+05:30" type="ReqRegMob" />
</RespRegMob>

6.10.1.4. Registration through National Id using APP

Request from IPS Payer Participants to IPS:

<ReqRegMob>
    <Head ver="2.0" ts="2025-06-03T09:12:07+02:00" orgId="700001"
        msgId="INDFFF5AA5B9EBF48C5B90DBB0A6BDB3D40" prodType="UPI" />
    <Txn id="MYSIM00000000001vRPtRTgqKswCTqFV7DG" note="Mobile registration" refId="21380"
        refUrl="http://www.npci.org.in" ts="2017-01-15T12:32:04.258+05:30" type="ReqRegMob" />
    <Payer addr="shruti@mypsp" name="2547BAU" seqNum="1" type="PERSON" code="0000" >
        <Device>
            <Tag name="GEOCODE" value="0.0 ,0.0 " />
            <Tag name="LOCATION" value="Mumbai" />

        Technical Specification Document                               277 | P a g e

<Tag name="IP" value="172.16.50.65" />
<Tag name="MOBILE" value="993456789" />
<Tag name="TYPE" value="MOB" />
<Tag name="ID" value="000000000000002" />
<Tag name="OS" value="android" />
<Tag name="APP" value="org.npci.upi.maggi" />
<Tag name="CAPABILITY" value="5200000200010004000639292929292" />
</Device>
<Ac addrType="ACCOUNT">
<Detail name="IFSC" value="AABY0000382" />
<Detail name="ACTYPE" value="SAVINGS" />
<Detail name="ACNUM" value="10001105827" />
</Ac>
</Payer>
<RegDetails type="FORMAT6">
<Creds>

<Cred type="OTP" subType="SMS">

                <Data code="NPCI"

ki="20150822">1.0|Yn80P37ju1W4ZU8jdN3v0kLNI+j8Go4JUP1kfDsAG6dehcaNg+3yx70JVS/5p4V/mx3UeMrNSyU/&#xd;
65ALfl0ltmCJW/hGQK6ajeZawxeMQRc5gRVlrcTopnUA05GhPQqJKZ7TFwR33V0+8p0Uht1E2/5i&#xd;
zsJSvjYp6UDt1zsiqN85WEfAGlueQeE1Ka+JZIXr7X2Uv8gWTY7F8L79DAyybdmWRkcZtqJERt5h&#xd;
oECmlNX5khKqg8y2yzc8zZenWNDtOFVXnWhs9snWd0pHdmKx/noH4KYNwbiY4DwFgBWju45z4eEi&#xd;
lT/b5k6X8KoRM/B987jrfmlTvtZ472X7fzFiHg==&#xd;
</Data>
</Cred>
<Cred type="PIN" subType="MPIN">
<Data code="NPCI"
ki="20150822">1.0|UKhAVOuG3dm48vIA86yhI8T6HpRLCnJW0QIq7IK8osjtH6CUea4zCBbHQu5ozPdNyKImKuYgPjOf&#xd;
QnTWOfRRnuRqPZu0badpz1qNtln1BVoXJn7pFtLAAc1G8EvMANIX0pcVfkOLrQTsA0l0O41gXMEu&#xd;
Vymp2226SMrVtVrjvr54ZCITcrWu6xmUI6usQPvy6GwdbaV84ZSqBE65Lgs8u9qPpf2a9GYIGSxA&#xd;
6xe36nCD7nRqpV2HeZbxYm6gr5LnFwUmOP+lDDODejbyvyTCmldKDie9JaAltlZdeT8J0umYxn0K&#xd;
iUX5OMzDvOLFYGY1h3be8DiEdEy3wnUSfZOJrg==&#xd;
</Data>
</Cred>
</Creds>

        Technical Specification Document                               278 | P a g e

</RegDetails>
</ReqRegMob>

Request from IPS to Issuer IPS Participant:

<ReqRegMob>
    <Head ver="2.0" ts="2025-06-03T09:12:07+02:00" orgId="NPCI" msgId="1xysV7ZA3loG" prodType="UPI" />
    <Txn id="MYSIM00000000001vRPtRTgqKswCTqFV7DG" note="Mobile registration" refId="21380"
        refUrl="http://www.npci.org.in" ts="2017-01-15T12:32:04.258+05:30" type="ReqRegMob" />
    <Payer addr="shruti@mypsp" name="2547BAU" seqNum="1" type="PERSON" code="0000">
        <Device>
            <Tag name="GEOCODE" value="0.0 ,0.0 " />
            <Tag name="LOCATION" value="Mumbai" />
            <Tag name="IP" value="172.16.50.65" />
            <Tag name="MOBILE" value="993456789" />
            <Tag name="TYPE" value="MOB" />
            <Tag name="ID" value="000000000000002" />
            <Tag name="OS" value="android" />
            <Tag name="APP" value="org.npci.upi.maggi" />
            <Tag name="CAPABILITY" value="5200000200010004000639292929292" />
        </Device>
        <Ac addrType="ACCOUNT">
            <Detail name="IFSC" value="AABY0000382" />
            <Detail name="ACTYPE" value="SAVINGS" />
            <Detail name="ACNUM" value="10001105827" />
        </Ac>
    </Payer>
    <RegDetails type="FORMAT6">

<Creds>

<Cred type="OTP" subType="SMS">

                <Data code="NPCI"

ki="20150822">1.0|Yn80P37ju1W4ZU8jdN3v0kLNI+j8Go4JUP1kfDsAG6dehcaNg+3yx70JVS/5p4V/mx3UeMrNSyU/&#xd;

        Technical Specification Document                               279 | P a g e

65ALfl0ltmCJW/hGQK6ajeZawxeMQRc5gRVlrcTopnUA05GhPQqJKZ7TFwR33V0+8p0Uht1E2/5i&#xd;
zsJSvjYp6UDt1zsiqN85WEfAGlueQeE1Ka+JZIXr7X2Uv8gWTY7F8L79DAyybdmWRkcZtqJERt5h&#xd;
oECmlNX5khKqg8y2yzc8zZenWNDtOFVXnWhs9snWd0pHdmKx/noH4KYNwbiY4DwFgBWju45z4eEi&#xd;
lT/b5k6X8KoRM/B987jrfmlTvtZ472X7fzFiHg==&#xd;
</Data>
</Cred>
<Cred type="PIN" subType="MPIN">
<Data code="NPCI"
ki="20150822">1.0|UKhAVOuG3dm48vIA86yhI8T6HpRLCnJW0QIq7IK8osjtH6CUea4zCBbHQu5ozPdNyKImKuYgPjOf&#xd;
QnTWOfRRnuRqPZu0badpz1qNtln1BVoXJn7pFtLAAc1G8EvMANIX0pcVfkOLrQTsA0l0O41gXMEu&#xd;
Vymp2226SMrVtVrjvr54ZCITcrWu6xmUI6usQPvy6GwdbaV84ZSqBE65Lgs8u9qPpf2a9GYIGSxA&#xd;
6xe36nCD7nRqpV2HeZbxYm6gr5LnFwUmOP+lDDODejbyvyTCmldKDie9JaAltlZdeT8J0umYxn0K&#xd;
iUX5OMzDvOLFYGY1h3be8DiEdEy3wnUSfZOJrg==&#xd;
</Data>
</Cred>
</Creds>
</RegDetails>
</ReqRegMob>

Response from Issuer Participant to IPS:

<RespRegMob>
    <Head ver="2.0" ts="2025-06-03T09:12:07.713+02:00" orgId="700001"
        msgId="XYA0000000000001vRPtRSgrisKMoFo7ALE" prodType="UPI" />
    <Resp reqMsgId="1xysV7ZA3loG" result="SUCCESS" />
    <Txn id="MYSIM00000000001vRPtRTgqKswCTqFV7DG" note="Mobile registration" refId="21380"
        refUrl="http://www.npci.org.in" ts="2017-01-15T12:32:04.258+05:30" type="ReqRegMob" />
</RespRegMob>

Response from IPS-to-IPS Participant:

        Technical Specification Document                               280 | P a g e

<RespRegMob>
<Head ver="2.0" ts="2025-06-03T09:12:07+02:00" orgId="NPCI" msgId="1xysV7ZA3loI" prodType="UPI" />
<Resp reqMsgId="INDFFF5AA5B9EBF48C5B90DBB0A6BDB3D40" result="SUCCESS" />
<Txn id="MYSIM00000000001vRPtRTgqKswCTqFV7DG" note="Mobile registration" refId="21380"
        refUrl="http://www.npci.org.in" ts="2017-01-15T12:32:04.258+05:30" type="ReqRegMob" />
</RespRegMob>

6.11. Check Transaction

Refer Specifications Check Transaction Status API

Payer IPS Participant initiated Check Transaction:

Request from Pyer IPS participant to IPS:

<ReqChkTxn>

    <Head ver="2.0" ts=" 2025-06-04T11:12:57+02:00" orgId="700001"
        msgId="AXI646bfc3856fc42559fbf0e230a9b9d2e" prodType="UPI" />
    <Txn id="MYSIM00000000001vRPtRTgqKswFyiZp5jG" note="Check Txn Status" refId="227329240405"
        refUrl="http:// axisbank.com/ upi" ts="2022-09-30T08:24:30+05:30" type="ChkTxn"
        orgMsgId="IOB05001102211353500XADMnPQlIokYjoB" orgTxnId="MYSIM00000001vRPtRTgqKswFxPLkyzK"
        custRef="227329240405" orgTxnDate="2025-04-29T17:09:29+05:30" initiationMode="00"
        subType="PAY" purpose="14" />

</ReqChkTxn>

Response from IPS to Payer IPS Participant:

<RespChkTxn>

<Head ver=" 2.0" ts=" 2025-06-04T11:12:57+02:00" orgId=" NPCI" msgId=" 1xysV9MVjYUi" prodType=" UPI"
/>

    <Txn id=" MYSIM00000000001vRPtRTgqKswFyiZp5jG" note=" Check Txn Status" refId=" 227329240405"
        refUrl=" http:// axisbank.com/ upi" ts=" 2022-09-30T08:24:30+05:30" type=" ChkTxn"

        Technical Specification Document                               281 | P a g e

orgMsgId=" IOB05001102211353500XADMnPQlIokYjoB" orgTxnId=" MYSIM00000001vRPtRTgqKswFxPLkyzK"
custRef=" 227329240405" orgTxnDate=" 2025-04-29T17:09:29+05:30" initiationMode=" 00"
subType=" PAY" purpose=" 14" />
<Resp reqMsgId=" AXI646bfc3856fc42559fbf0e230a9b9d2e" result=" SUCCESS">
<Ref type="PAYER" seqNum="1" addr="PRE@mypsp" settAmount="1.00" settCurrency="NAD"
            approvalNum="123456" respCode="00" orgAmount="1.00" />
<Ref type="PAYEE" seqNum="1" addr="2678892001829@AABY0000382.ifsc.npci"
settAmount="1.00" settCurrency="NAD" approvalNum="654321" respCode="00"

regName="SonySuper" orgAmount="1.00" />

    </Resp>

</RespChkTxn>
6.12.  OTP API

Refer Specifications OTP API

Request from Payer IPS Participant to IPS:

<?xml version='1.0' encoding='UTF-8'?>

<ns2:ReqOtp xmlns:ns2="http://npci.org/upi/schema/">
<Head ver="2.0" ts="2025-06-11T12:18:49+05:30" orgId="700001"
        msgId="XYD7f0b408a66d1458a8ec6122f49fa3797" prodType="UPI" />
<Txn id="MYSIM00000000005sp4lmzgebTqNbrp2Rq" note="Otp Req" refId="0"
        refUrl="http://axis.com/upi" ts="2018-07-11T11:40:25.947+05:30" type="Otp" />
<Payer addr="wenkar@mypsp" name="CHMURALIMOHAN" seqNum="1" type="PERSON" code="0000">
<Device>
<Tag name="MOBILE" value="993456789" />
<Tag name="GEOCODE" value="19.0911 ,72.9208" />
<Tag name="ID" value="000000000000002" />
<Tag name="OS" value="android" />
<Tag name="IP" value="10.38.171.177" />
<Tag name="APP" value="com.upi.axispay" />
<Tag name="LOCATION" value="Hyderabad" />
<Tag name="TYPE" value="MOB" />
<Tag name="CAPABILITY" value="011001" />

        Technical Specification Document                               282 | P a g e

</Device>
<Ac addrType="ACCOUNT">
<Detail name="IFSC" value="AABY0009009" />
<Detail name="ACTYPE" value="SAVINGS" />
<Detail name="ACNUM" value="10001105827" />
</Ac>
</Payer>
</ns2:ReqOtp>

ReqOtp request to Issuer Bank from IPS:

<ns2:ReqOtp xmlns:ns2="http://npci.org/upi/schema/">
<Head ver="2.0" ts="2025-06-11T12:18:55+05:30" orgId="NPCI" msgId="4EyZ1061Y" prodType="UPI" />
<Txn id="MYSIM00000000005sp4lmzgebTqNbrp2Rq" note="Otp Req" refId="0"
        refUrl="http://axis.com/upi" ts="2018-07-11T11:40:25.947+05:30" type="Otp" />
<Payer addr="wenkar@mypsp" name="CHMURALIMOHAN" seqNum="1" type="PERSON" code="0000">
<Device>
<Tag name="MOBILE" value="993456789" />
<Tag name="GEOCODE" value="19.0911 ,72.9208" />
<Tag name="ID" value="000000000000002" />
<Tag name="OS" value="android" />
<Tag name="IP" value="10.38.171.177" />
<Tag name="APP" value="com.upi.axispay" />
<Tag name="LOCATION" value="Hyderabad" />
<Tag name="TYPE" value="MOB" />
<Tag name="CAPABILITY" value="011001" />
</Device>
<Ac addrType="ACCOUNT">
<Detail name="IFSC" value="AABY0009009" />
<Detail name="ACTYPE" value="SAVINGS" />
<Detail name="ACNUM" value="10001105827" />
</Ac>
</Payer>
</ns2:ReqOtp>

        Technical Specification Document                               283 | P a g e

Response from Issuer Participant to IPS:

<RespOtp>
    <Head ver="2.0" ts="2025-06-11T12:18:56.454+05:30" orgId="700001"
        msgId="XYA0000000000005sp4lmzgebTqNc79UKk" />
    <Resp reqMsgId="4EyZ1061Y" result="SUCCESS" />
    <Txn id="MYSIM00000000005sp4lmzgebTqNbrp2Rq" note="Otp Req" refId="0"
        refUrl="http://axis.com/upi" ts="2018-07-11T11:40:25.947+05:30" type="Otp" />
</RespOtp>

Response from IPS to Acquire IPS Participant:

<RespOtp>
    <Head ver="2.0" ts="2025-06-11T12:18:58+05:30" orgId="NPCI" msgId="4EyZ11m4I" />
    <Resp reqMsgId="XYD7f0b408a66d1458a8ec6122f49fa3797" result="SUCCESS" />
    <Txn id="MYSIM00000000005sp4lmzgebTqNbrp2Rq" note="Otp Req" refId="0"
        refUrl="http://axis.com/upi" ts="2018-07-11T11:40:25.947+05:30" type="Otp" />
</RespOtp>

6.13. Balance Enquiry

Refer Specifications Balance-Enquiry API

Request from Payer IPS Participant to IPS:

<ReqBalEnq>
    <Head ver="2.0" ts="2025-06-03T10:48:35+02:00" orgId="700001"
        msgId="XYD1442cdd8a121449cae3ab0034f72b165" prodType="UPI" />

        Technical Specification Document                               284 | P a g e

<Txn id="MYSIM00000000001vRPtRTgqKswD3CtDmeI" note="Balance Enquiry" refId="702314088080"
        refUrl="http://upi" ts="2017-01-23T14:14:54.040+05:30" type="BalEnq" custRef="702314088080"
/>
<Payer addr="pass@mypsp" name="rahul" seqNum="1" type="ENTITY" code="5310">
<Info>
<Identity type="ACCOUNT" verifiedName="KASHYAP PRAKASH NANDWANA" id="029010100347310" />
</Info>
<Device>
<Tag name="GEOCODE" value="288177,1234" />
<Tag name="LOCATION" value="Mumbai,Maharashtra" />
<Tag name="IP" value="124.170.23.22" />
<Tag name="MOBILE" value="993456789" />
<Tag name="TYPE" value="MOB" />
<Tag name="ID" value="000000000000002" />
<Tag name="OS" value="android" />
<Tag name="APP" value="org.npci.upi.maggi" />
<Tag name="CAPABILITY" value="5200000200010004000639292929292" />
</Device>
<Ac addrType="ACCOUNT">
<Detail name="IFSC" value="AABY0000382" />
<Detail name="ACTYPE" value="SAVINGS" />
<Detail name="ACNUM" value="10001105827" />
</Ac>
<Creds>
<Cred type="PIN" subType="MPIN">
<Data code="NPCI" ki="20150822">
2.0|E3UeNksvHBiza5rPFI+Amk/1Vz7GH5/EYMaj1+hacnMLrxA7gl1KrOonqex+9NUYVcwuCJFTyomKrGVGFMQ6cqrIoFU1YnbjB
hzIBRY8Le23UWcNGNfF9KJUa2fHC0OfzoGg+6YwYJCfxloBwxqTVa2/1WyG0U81R/bGELDpRrqMaMm2/Y6IxNjmKmEsFgNIwlv2E4

ZVFtoX9D8cIY4tx1nVr2DpcOOttLZNktRDEKTOr7kCxxBiZNKEAHOvL2/+5twZpQtUELt0gVZmLU5wq+Bi+JXTDOhRU3Ejk1
2W5R3Tc6ZX3WFW3pmr/t8a0n5uTZRWnIQzSYQGFiXHSEVmwg==</Data>

            </Cred>
        </Creds>
    </Payer>

</ReqBalEnq>

        Technical Specification Document                               285 | P a g e

Request from IPS to Issuer IPS Participant:

<ReqBalEnq>
    <Head ver="2.0" ts="2025-06-03T10:48:35+02:00" orgId="NPCI" msgId="1xysV80Uxja5" prodType="UPI"
/>
    <Txn id="MYSIM00000000001vRPtRTgqKswD3CtDmeI" note="Balance Enquiry" refId="702314088080"
        refUrl="http://upi" ts="2017-01-23T14:14:54.040+05:30" type="BalEnq" custRef="702314088080"
/>
    <Payer addr="pass@mypsp" name="rahul" seqNum="1" type="ENTITY" code="5310">
        <Info>
            <Identity type="ACCOUNT" verifiedName="KASHYAP PRAKASH NANDWANA" id="029010100347310" />
        </Info>
        <Device>
            <Tag name="GEOCODE" value="288177,1234" />
            <Tag name="LOCATION" value="Mumbai,Maharashtra" />
            <Tag name="IP" value="124.170.23.22" />
            <Tag name="MOBILE" value="993456789" />
            <Tag name="TYPE" value="MOB" />
            <Tag name="ID" value="000000000000002" />
            <Tag name="OS" value="android" />
            <Tag name="APP" value="org.npci.upi.maggi" />
            <Tag name="CAPABILITY" value="5200000200010004000639292929292" />
        </Device>
        <Ac addrType="ACCOUNT">
            <Detail name="IFSC" value="AABY0000382" />
            <Detail name="ACTYPE" value="SAVINGS" />
            <Detail name="ACNUM" value="10001105827" />
        </Ac>
        <Creds>
            <Cred type="PIN" subType="MPIN">
                <Data code="NPCI" ki="20150822">
2.0|E3UeNksvHBiza5rPFI+Amk/1Vz7GH5/EYMaj1+hacnMLrxA7gl1KrOonqex+9NUYVcwuCJFTyomKrGVGFMQ6cqrIoFU1YnbjB
hzIBRY8Le23UWcNGNfF9KJUa2fHC0OfzoGg+6YwYJCfxloBwxqTVa2/1WyG0U81R/bGELDpRrqMaMm2/Y6IxNjmKmEsFgNIwlv2E4

        Technical Specification Document                               286 | P a g e

ZVFtoX9D8cIY4tx1nVr2DpcOOttLZNktRDEKTOr7kCxxBiZNKEAHOvL2/+5twZpQtUELt0gVZmLU5wq+Bi+JXTDOhRU3Ejk12W5R3
Tc6ZX3WFW3pmr/t8a0n5uTZRWnIQzSYQGFiXHSEVmwg==</Data>
</Cred>
</Creds>
</Payer>
</ReqBalEnq>

Response from Issuer Participants to IPS:

<RespBalEnq>
    <Head ver="2.0" ts="2025-06-03T10:48:35.744+02:00" orgId="700001"
        msgId="XYA0000000000001vRPtRSgrisKMyRb4pIH" prodType="UPI" />
    <Resp reqMsgId="1xysV80Uxja5" result="SUCCESS" />
    <Txn id="MYSIM00000000001vRPtRTgqKswD3CtDmeI" note="Balance Enquiry" refId="702314088080"
        refUrl="http://upi" ts="2017-01-23T14:14:54.040+05:30" type="BalEnq" custRef="702314088080" />
    <Payer addr="pass@mypsp" name="rahul" seqNum="1" type="ENTITY" code="5310">
        <Bal>
            <Data>MTAwMTM1NkMwMDAwMDAwNDA1MjUxMDAyMzU2QzAwMDAwMDA0MDUyNQ==</Data>
        </Bal>
    </Payer>
</RespBalEnq>

Response from IPS to Payer IPS Participants:

<RespBalEnq>
    <Head ver="2.0" ts="2025-06-03T10:48:35+02:00" orgId="NPCI" msgId="1xysV80Uxja7" prodType="UPI" />
    <Resp reqMsgId="XYD1442cdd8a121449cae3ab0034f72b165" result="SUCCESS" />
    <Txn id="MYSIM00000000001vRPtRTgqKswD3CtDmeI" note="Balance Enquiry" refId="702314088080"
        refUrl="http://upi" ts="2017-01-23T14:14:54.040+05:30" type="BalEnq" custRef="702314088080" />
    <Payer addr="pass@mypsp" name="rahul" seqNum="1" type="ENTITY" code="5310">
        <Bal>
            <Data>MTAwMTM1NkMwMDAwMDAwNDA1MjUxMDAyMzU2QzAwMDAwMDA0MDUyNQ==</Data>

        Technical Specification Document                               287 | P a g e

</Bal>
</Payer>
</RespBalEnq>

6.14. Get Address API

Refer Specifications Get Address API

Get Address with type=”CHECK”

Request from IPS Participant to IPS:
<ReqGetAdd>
<Head ver="2.0" ts="2025-06-05T10:57:55+02:00" orgId="700001"
        msgId="XYD1442cdd8a121449cae3ab0034f72b165" prodType="UPI" />
<Txn id="MYSIM00000000001vRPtRTgqKswHYPvXms8" note="Mapper" refId="702314088080"
        refUrl="http://upi" ts="2017-01-23T14:14:54.040+05:30" type="CHECK" />
<Payer addr="atmvpa@mypsp" name="Rushikesh Garje" seqNum="1" type="PERSON" code="0000">
<Device>
<Tag name="GEOCODE" value="288177,1234" />
<Tag name="LOCATION" value="Mumbai,Maharashtra" />
<Tag name="IP" value="124.170.23.22" />
<Tag name="MOBILE" value="993456789" />
<Tag name="TYPE" value="MOB" />
<Tag name="ID" value="000000000000002" />
<Tag name="OS" value="android" />
<Tag name="APP" value="org.npci.upi.maggi" />
<Tag name="CAPABILITY" value="5200000200010004000639292929292" />
</Device>
<Consent name="CMREGISTRATION" value="Y" />
<RegIdDetails>
<Id name="MOBILE" value="993456789" />
</RegIdDetails>
</Payer>
</ReqGetAdd>

        Technical Specification Document                               288 | P a g e

Response from IPS-to-IPS Participant:

<RespGetAdd>

    <Head ver="2.0" ts="2025-06-05T10:57:55+02:00" orgId="NPCI" msgId="1xysVbxhtQX0" prodType=”UPI”/>
    <Txn id="MYSIM00000000001vRPtRTgqKswHYPvXms8" note="Mapper" refId="702314088080"
        refUrl="http://upi" ts="2017-01-23T14:14:54.040+05:30" type="CHECK" />
    <Resp reqMsgId="XYD1442cdd8a121449cae3ab0034f72b165" result="SUCCESS">
        <RegIdDetails addr="atmvpa@mypsp" type="PERSON" idStatus="NEW">
            <Id name="MOBILE" value="993456789" />
        </RegIdDetails>
    </Resp>

</RespGetAdd>

Get Address with type=” FETCH”

Request from IPS Participant to IPS:

<ReqGetAdd>
    <Head ver="2.0" ts="2025-06-05T11:18:26+02:00" orgId="700001"
        msgId="XYD1442cdd8a121449cae3ab0034f72b165" prodType="UPI" />
    <Txn id="MYSIM00000000001vRPtRTgqKswI0ZRyH5u" note="Mapper" refId="702314088080"
        refUrl="http://upi" ts="2017-01-23T14:14:54.040+05:30" type="FETCH" subType="ID" />
    <Payer addr="atmvpa@mypsp" name="Rushikesh Garje" seqNum="1" type="PERSON" code="0000">
        <Device>
            <Tag name="GEOCODE" value="288177,1234" />
            <Tag name="LOCATION" value="Mumbai,Maharashtra" />
            <Tag name="IP" value="124.170.23.22" />
            <Tag name="MOBILE" value="993456789" />
            <Tag name="TYPE" value="MOB" />
            <Tag name="ID" value="000000000000002" />
            <Tag name="OS" value="android" />
            <Tag name="APP" value="org.npci.upi.maggi" />
            <Tag name="CAPABILITY" value="5200000200010004000639292929292" />

        Technical Specification Document                               289 | P a g e

</Device>
<Consent name="CMREGISTRATION" value="Y" />
<RegIdDetails>
<Id name="MOBILE" value="993456789" />
</RegIdDetails>
</Payer>
</ReqGetAdd>

Response from IPS-to-IPS Participant:

<RespGetAdd>

<Head ver="2.0" ts="2025-06-05T11:18:26+02:00" orgId="NPCI" msgId="1xysVby77Kai" prodType="UPI"

/>
<Txn id="MYSIM00000000001vRPtRTgqKswI0ZRyH5u" note="Mapper" refId="702314088080"
        refUrl="http://upi" ts="2017-01-23T14:14:54.040+05:30" type="FETCH" subType="ID" />
<Resp reqMsgId="XYD1442cdd8a121449cae3ab0034f72b165" result="SUCCESS">
<RegIdDetails addr="atmvpa@mypsp" type="PERSON" idStatus="ACTIVE"
            lastUpdatedTs="2025-06-05T11:14:28+02:00" channel="MOB">
<Id name="MOBILE" value="993456789" />
</RegIdDetails>
</Resp>
</RespGetAdd>

Get Address with type=” FETCH” and subtype=”VPA”

Request from Payer Participant to IPS:

        Technical Specification Document                               290 | P a g e

<ReqGetAdd>

<Head msgId="XYD1442cdd8a121449cae3ab0034f72b165" orgId="159047" prodType="UPI" ts="2021-08-
20T09:29:38+05:30" ver="2.0"/>
<Txn custRef="105015641974" id="MMM0000000000005t0xf6TRJPgu8uN7bIkp"
note="Mapper" refId="702314088080" refUrl="http://upi" subType="VPA"
ts="2017-01-23T14:14:54.040+05:30" type="FETCH"/>
<Payer addr="testingpsp01@csb" code="0000" name="" seqNum="1" type="PERSON">
<Device>

<Tag name="MOBILE" value="91976994864"/>
<Tag name="GEOCODE" value=""/>
<Tag name="LOCATION" value=""/>
<Tag name="IP" value="124.170.23.22"/>
<Tag name="TYPE" value="MOB"/>
<Tag name="ID" value="000000000000001"/>
<Tag name="OS" value="android"/>
<Tag name="APP" value="org.npci.upi.security.commonsapp"/>
<Tag name="CAPABILITY" value="5200000200010004000639292929292"/>

</Device>
<Consent name="CMREGISTRATION" value="Y"/>
</Payer>

</ReqGetAdd>

Response from IPS to Payer Participant:

<RespGetAdd>

<Head ver="2.0" ts="2021-08-20T09:29:39+05:30" orgId="NPCI" msgId="
5t0xf6ZKer9I6G1iJA51234567890ABC345"/>
<Txn id="MMM0000000000005t0xf6TRJPgu8uN7bIkp" note="Mapper" refId="702314088080"
refUrl="http://upi" ts="2017-01-23T14:14:54.040+05:30" type="FETCH" custRef="105015641974"
subType="VPA"/>
<Resp reqMsgId="XYD1442cdd8a121449cae3ab0034f72b165" result="SUCCESS">

        Technical Specification Document                               291 | P a g e

<RegIdDetails addr="testingpsp01@csb" idStatus="ACTIVE">
<Id name="MOBILE" value="908092456"/>
</RegIdDetails>

</Resp>
</RespGetAdd>

Get Address with type=”PORT”

Request from IPS Participant to IPS:

<ReqGetAdd>
    <Head ver="2.0" ts="2025-06-05T11:22:08+02:00" orgId="700001"
        msgId="XYD1442cdd8a121449cae3ab0034f72b165" prodType="UPI" />
    <Txn id="MYSIM00000000001vRPtRTgqKswI1o5d3Bm" note="Mapper" refId="702314088080"
        refUrl="http://upi" ts="2017-01-23T14:14:54.040+05:30" type="PORT" />
    <Payer addr="123456789@mypsp" name="Rushikesh Garje" seqNum="1" type="PERSON" code="0000">
        <Device>
            <Tag name="GEOCODE" value="288177,1234" />
            <Tag name="LOCATION" value="Mumbai,Maharashtra" />
            <Tag name="IP" value="124.170.23.22" />
            <Tag name="MOBILE" value="993456789" />
            <Tag name="TYPE" value="MOB" />
            <Tag name="ID" value="000000000000002" />
            <Tag name="OS" value="android" />
            <Tag name="APP" value="org.npci.upi.maggi" />
            <Tag name="CAPABILITY" value="5200000200010004000639292929292" />
        </Device>
        <Consent name="CMREGISTRATION" value="Y" />
        <RegIdDetails>
            <Id name="MOBILE" value="993456789" />
        </RegIdDetails>
    </Payer>
</ReqGetAdd>

        Technical Specification Document                               292 | P a g e

Response from IPS to IPS Participant:

<RespGetAdd>

<Head ver="2.0" ts="2025-06-05T11:22:08+02:00" orgId="NPCI" msgId="1xysVby8CTpk" prodType=”UPI”

/>
<Txn id="MYSIM00000000001vRPtRTgqKswI1o5d3Bm" note="Mapper" refId="702314088080"
        refUrl="http://upi" ts="2017-01-23T14:14:54.040+05:30" type="PORT" />
<Resp reqMsgId="XYD1442cdd8a121449cae3ab0034f72b165" result="SUCCESS">
<RegIdDetails addr="atmvpa@mypsp" type="PERSON" idStatus="ACTIVE"
            lastUpdatedTs="2025-06-05T11:14:28+02:00" channel="MOB">
<Id name="MOBILE" value="993456789" />
</RegIdDetails>
</Resp>
</RespGetAdd>

6.15. RegMapper API

Refer Specifications RegMapper API

ReqRegMapper with type = “ADD”

Request from IPS Participant to IPS :

<ReqRegMapper>
    <Head ver="2.0" ts="2025-06-09T13:00:01+02:00" orgId="700002"
        msgId="XYD1442cdd8a121449cae3ab0034f72b165" prodType="UPI" />
    <Txn id="MYSIM00000000001vRPtRTgqKswS0aYqd4A" note="Mapper" refId="702314088080"
        refUrl="http://upi" ts="2017-01-23T14:14:54.040+05:30" type="CMREGISTRATION" op="ADD" />
    <Payer addr="atmvpa@mypsp2" name="Agath" seqNum="1" type="PERSON" code="0000">
        <Device>
            <Tag name="GEOCODE" value="288177,1234" />

        Technical Specification Document                               293 | P a g e

<Tag name="LOCATION" value="Mumbai,Maharashtra" />
<Tag name="IP" value="124.170.23.22" />
<Tag name="MOBILE" value="993456780" />
<Tag name="TYPE" value="MOB" />
<Tag name="ID" value="000000000000002" />
<Tag name="OS" value="android" />
<Tag name="APP" value="org.npci.upi.maggi" />
<Tag name="CAPABILITY" value="5200000200010004000639292929292" />
</Device>
<Ac addrType="ACCOUNT">
<Detail name="IFSC" value="AABF0000382" />
<Detail name="ACTYPE" value="SAVINGS" />
<Detail name="ACNUM" value="3453454385" />
</Ac>
<Consent name="CMREGISTRATION" value="Y" />
<RegIdDetails>
<Id name="MOBILE" value="993456780" setStatus="ACTIVE" />
</RegIdDetails>
</Payer>
</ReqRegMapper>

Response from IPS to IPS Participant :

<RespRegMapper>
    <Head ver="2.0" ts="2025-06-09T13:00:01+02:00" orgId="NPCI" msgId="1xysViCNj7Xb" prodType="UPI"

/>

    <Txn id="MYSIM00000000001vRPtRTgqKswS0aYqd4A" note="Mapper" refId="702314088080"
        refUrl="http://upi" ts="2017-01-23T14:14:54.040+05:30" type="CMREGISTRATION" op="ADD" />
    <Resp reqMsgId="XYD1442cdd8a121449cae3ab0034f72b165" result="SUCCESS">
        <RegIdDetails addr="atmvpa@mypsp2">
            <Id name="MOBILE" value="993456780" setStatus="ACTIVE" />
        </RegIdDetails>
    </Resp>

</RespRegMapper>

        Technical Specification Document                               294 | P a g e

ReqRegMapper with type = “MODIFY”

Request from IPS Participant to IPS :

<ReqRegMapper>
    <Head ver="2.0" ts="2025-06-09T13:35:52+02:00" orgId="700001"
        msgId="XYD1442cdd8a121449cae3ab0034f72b165" prodType="UPI" />
    <Txn id="MYSIM00000000001vRPtRTgqKswS3XI8BZ6" note="Mapper" refId="702314088080"
        refUrl="http://upi" ts="2017-01-23T14:14:54.040+05:30" type="CMREGISTRATION"
        custRef="105015571146" op="MODIFY" />
    <Payer addr="atmvpa2@mypsp" name="Rushikesh Garje" seqNum="1" type="PERSON" code="0000">
        <Device>
            <Tag name="GEOCODE" value="288177,1234" />
            <Tag name="LOCATION" value="Mumbai,Maharashtra" />
            <Tag name="IP" value="124.170.23.22" />
            <Tag name="MOBILE" value="993456780" />
            <Tag name="TYPE" value="MOB" />
            <Tag name="ID" value="000000000000002" />
            <Tag name="OS" value="android" />
            <Tag name="APP" value="org.npci.upi.maggi" />
            <Tag name="CAPABILITY" value="5200000200010004000639292929292" />
        </Device>
        <Ac addrType="ACCOUNT">
            <Detail name="IFSC" value="AABF0000382" />
            <Detail name="ACTYPE" value="SAVINGS" />
            <Detail name="ACNUM" value="3453454385" />
        </Ac>
        <Consent name="CMREGISTRATION" value="Y" prevVpa="atmvpa@mypsp2" />
        <RegIdDetails>
            <Id name="MOBILE" value="993456780" setStatus="ACTIVE" />
        </RegIdDetails>
    </Payer>
</ReqRegMapper>

        Technical Specification Document                               295 | P a g e

Response from IPS Participant to IPS:

<RespRegMapper>
    <Head ver="2.0" ts="2025-06-09T13:35:52+02:00" orgId="NPCI" msgId="1xysViD1RFmL" />
    <Txn id="MYSIM00000000001vRPtRTgqKswS3XI8BZ6" note="Mapper" refId="702314088080"
        refUrl="http://upi" ts="2017-01-23T14:14:54.040+05:30" type="CMREGISTRATION"
        custRef="105015571146" op="MODIFY" />
    <Resp reqMsgId="XYD1442cdd8a121449cae3ab0034f72b165" result="SUCCESS">
        <RegIdDetails addr="atmvpa2@mypsp">
            <Id name="MOBILE" value="993456780" setStatus="ACTIVE" />
        </RegIdDetails>
    </Resp>
</RespRegMapper>

6.16. Mapper Confirmation

Refer Specifications ReqMapperConfirmation API

Confirmation Request from IPS to Previous IPS PSP:

<ReqMapperConfirmation>
    <Head ver="2.0" ts="2025-06-09T13:35:52+02:00" orgId="700002" msgId="1xysViD1RFmN"
        prodType="UPI" />
    <Txn id="MYSIM00000000001vRPtRTgqKswS3XI8BZ6" note="Mapper" refId="702314088080"
        refUrl="http://upi" ts="2017-01-23T14:14:54.040+05:30" type="ReqMapperConfirmation"
        custRef="105015571146" />
    <TxnConfirmation orgStatus="SUCCESS" op="MODIFY" note="Check" >
        <Refs type="PAYER" addr="atmvpa2@mypsp" cmId="993456780" channel="MOB" status="ACTIVE" />
        <Consent name="CMREGISTRATION" value="Y" prevVpa="atmvpa@mypsp2" />
    </TxnConfirmation>
</ReqMapperConfirmation>

        Technical Specification Document                               296 | P a g e

Confirmation Response from Previous PSP to IPS:

<RespMapperConfirmation>
    <Head ver="" ts="2025-06-09T13:35:52.525+02:00" orgId="700002"
        msgId="XYB0000000000001vRPtRSgrisL1zcq2Cti" prodType=”UPI” />
    <Txn id="MYSIM00000000001vRPtRTgqKswS3XI8BZ6" note="Mapper" refId="702314088080"
        refUrl="http://upi" ts="2017-01-23T14:14:54.040+05:30" type="ReqMapperConfirmation"
        custRef="105015571146" />
    <Resp reqMsgId="1xysViD1RFmN" result="SUCCESS" />
</RespMapperConfirmation>

6.17. Payment Request

Refer Specifications Pay API

P2P

Request from Payer IPS Participant to IPS: ReqPay with type = “PAY”

<ReqPay>
    <Head ver="2.0" ts="2025-06-09T11:27:41+02:00" orgId="700001"
        msgId="XYD0000000000001GRDpegB9EWpFIHL7Tzs" prodType="UPI" />
    <Meta>
        <Tag name="PAYREQSTART" value="2017-12-04T14:15:35+05:30" />
        <Tag name="PAYREQEND" value="2017-12-04T14:15:35+05:30" />
    </Meta>
    <Txn id="MYSIM00000001vRPtRTgqKswRQqezciI" note="test" refId="Ref"
        refUrl="https://www.sbi.co.in/" ts="2018-03-02T16:27:44+05:30" type="PAY"
        custRef="516011845328" initiationMode="00" purpose="00">
        <RiskScores>
            <Score provider="psp1" type="TXNRISK" value="00032" />
            <Score provider="psp3" type="TXNRISK" value="00040" />

        Technical Specification Document                               297 | P a g e

</RiskScores>
</Txn>
<Payer addr="payer@mypsp" name="Shyam" seqNum="1" type="PERSON" code="0000">
<Info>
<Identity type="PAN" verifiedName="Ram" id="SDF45645BJB22" />
<Rating verifiedAddress="TRUE"></Rating>
</Info>
<Device>
<Tag name="MOBILE" value="993456789" />
<Tag name="TYPE" value="MOB" />
<Tag name="ID" value="000000000000002" />
<Tag name="OS" value="android" />
<Tag name="APP" value="org.npci.upi.maggi" />
</Device>
<Ac addrType="ACCOUNT">
<Detail name="IFSC" value="AABY0000382" />
<Detail name="ACTYPE" value="SAVINGS" />
<Detail name="ACNUM" value="3453454385" />
</Ac>
<Creds>
<Cred type="PIN" subType="MPIN">
<Data code="NPCI"
ki="20150822">2.0|FHlMEnFHQlfVGKJGDvGH5vEW75jPpJ6lpc/jr3l2Hitc9cwV9V4rRsCnFYav+Ge3/JGXpQTopLL0&#xd;
vzQGjE5K8kUmiXyb4x+TU3jWgbx+HuplJQcMeTbFnb+n70U7K4ix76eEFSBLkzpdfZiDO0X69KER&#xd;
ExGCWz90btFA8aFVQBzDE0bbrt6L1RT50sal+Hxzuf1T/Zkye82srgq338SDSI/bC40EgGY54a+p&#xd;
95uZeh4NiC4qsTxnQiaUlKeqAKBeILNG3BRkQ1PpeQh+aeBEOzOsOyctlye8QKg5fJEBWnKPx5wG&#xd;
SObbr4LCbdJ5zOd138Ah7Jjf8BnpKpprHMLkAg==&#xd;
</Data>
</Cred>
</Creds>
<Amount value="1.00" curr="NAD" />
</Payer>
<Payees>
<Payee addr="ree@mypsp" name="ree" seqNum="1" type="PERSON" code="0000" cmId="">
<Amount value="1.00" curr="NAD" />

        Technical Specification Document                               298 | P a g e

</Payee>
</Payees>
</ReqPay>

ReqAuthDetails to Payee IPS Participants from IPS: ReqAuthDetails

<ReqAuthDetails>
    <Head ver="2.0" ts="2025-06-09T11:27:41+02:00" orgId="NPCI" msgId="1xysViANc6bE" />
    <Txn id="MYSIM00000001vRPtRTgqKswRQqezciI" note="test" refId="Ref"
        refUrl="https://www.sbi.co.in/" ts="2018-03-02T16:27:44+05:30" type="PAY"
        custRef="516011845328" initiationMode="00" purpose="00">
        <RiskScores>
            <Score provider="psp1" type="TXNRISK" value="00032" />
            <Score provider="psp3" type="TXNRISK" value="00040" />
        </RiskScores>
    </Txn>
    <Payees>
        <Payee addr="ree@mypsp" name="ree" seqNum="1" type="PERSON" code="0000" cmId="">
            <Amount value="1.00" curr="NAD" />
        </Payee>
    </Payees>
    <Payer addr="payer@mypsp" name="Shyam" seqNum="1" type="PERSON" code="0000">
        <Info>
            <Identity type="PAN" verifiedName="Ram" id="SDF45645BJB22" />
            <Rating verifiedAddress="TRUE"></Rating>
        </Info>
        <Ac addrType="ACCOUNT">
            <Detail name="IFSC" value="AABY0000382" />
            <Detail name="ACTYPE" value="SAVINGS" />
            <Detail name="ACNUM" value="3453454385" />
        </Ac>
        <Amount value="1.00" curr="NAD" />
    </Payer>
</ReqAuthDetails>

        Technical Specification Document                               299 | P a g e

RespAuthDetails from Payee IPS Participant to IPS:

<RespAuthDetails>
    <Head ver="2.0" ts="2025-06-09T11:27:41.686+02:00" orgId="700001"
        msgId="XYA0000000000001vRPtRSgrisL1lEVCkXl" />
    <Resp reqMsgId="1xysViANc6bE" result="SUCCESS" />
    <Txn id="MYSIM00000001vRPtRTgqKswRQqezciI" note="test" refId="Ref"
        refUrl="https://www.sbi.co.in/" ts="2018-03-02T16:27:44+05:30" type="PAY"
        custRef="516011845328" initiationMode="00" purpose="00">
        <RiskScores>
            <Score provider="SBI" type="TXNRISK" value="10" />
        </RiskScores>
    </Txn>
    <Payer addr="payer@mypsp" name="Shyam" seqNum="1" type="PERSON" code="0000">
        <Info>
            <Identity type="PAN" verifiedName="Ram" id="SDF45645BJB22" />
            <Rating verifiedAddress="TRUE"></Rating>
        </Info>
        <Ac addrType="ACCOUNT">
            <Detail name="IFSC" value="AABY0000382" />
            <Detail name="ACTYPE" value="SAVINGS" />
            <Detail name="ACNUM" value="3453454385" />
        </Ac>
        <Amount value="1.00" curr="NAD" />
    </Payer>
    <Payees>
        <Payee addr="ree@mypsp" name="ree" seqNum="1" type="PERSON" code="0000" cmId="">
            <Info>
                <Identity type="ACCOUNT" verifiedName="narayanan" id="AAB45645BJB15" />
                <Rating verifiedAddress="TRUE"></Rating>
            </Info>
            <Device>
                <Tag name="MOBILE" value="993456780" />

        Technical Specification Document                               300 | P a g e

<Tag name="APP" value="org.npci.upi.maggi" />
<Tag name="TYPE" value="MOB" />
<Tag name="ID" value="0000000000000020" />
</Device>
<Ac addrType="ACCOUNT">
<Detail name="IFSC" value="AABY0000382" />
<Detail name="ACNUM" value="2678892001829" />
<Detail name="ACTYPE" value="SAVINGS" />
</Ac>
<Amount value="1.00" curr="NAD" />
</Payee>
</Payees>
</RespAuthDetails>

Debit Request from IPS to Remitter SoV Provider: ReqPay with type=” DEBIT”:

<ReqPay>
    <Head ver="2.0" ts="2025-06-09T11:27:43+02:00" orgId="NPCI" msgId="1xysViANcWdy" />
    <Meta>
        <Tag name="PAYREQSTART" value="2017-12-04T14:15:35+05:30" />
        <Tag name="PAYREQEND" value="2017-12-04T14:15:35+05:30" />
    </Meta>
    <Txn id="MYSIM00000001vRPtRTgqKswRQqezciI" note="test" refId="Ref"
        refUrl="https://www.sbi.co.in/" ts="2018-03-02T16:27:44+05:30" type="DEBIT"
        custRef="516011845328" initiationMode="00" subType="PAY" purpose="00">
        <RiskScores>
            <Score provider="psp1" type="TXNRISK" value="00032" />
            <Score provider="psp3" type="TXNRISK" value="00040" />
            <Score provider="NPCI" type="TXNRISK" value="00999" />
        </RiskScores>
    </Txn>

        Technical Specification Document                               301 | P a g e

<Payer addr="payer@mypsp" name="Shyam" seqNum="1" type="PERSON" code="0000">
<Info>
<Identity type="PAN" verifiedName="Ram" id="SDF45645BJB22" />
<Rating verifiedAddress="TRUE"></Rating>
</Info>
<Device>
<Tag name="MOBILE" value="993456789" />
<Tag name="TYPE" value="MOB" />
<Tag name="ID" value="000000000000002" />
<Tag name="OS" value="android" />
<Tag name="APP" value="org.npci.upi.maggi" />
</Device>
<Ac addrType="ACCOUNT">
<Detail name="IFSC" value="AABY0000382" />
<Detail name="ACTYPE" value="SAVINGS" />
<Detail name="ACNUM" value="3453454385" />
</Ac>
<Creds>
<Cred type="PIN" subType="MPIN">
<Data code="700001" ki="20160217">

B9jvjTmAfuktxnAYaJ12MIexo5D3rf4Zr8NS4Irpk6mrCbeaIxUTkWCfu8mXGTlFQq3CpxN+DCwmKTj63LGK3TceMJtsL2uZQ1sPh
mx3HOSe0AxmllBKUblCok71AN/mfB7pTmzw3mEeVbTGEwYECNqmU/J5sxtjJ4KmPtHrNW8QhI+uzEHllszCBtlb4EgZ2tuXkiu0Ig
UjXS+h73WSWhcs5OYdBHIPILXZjzPzsfQYTmRnNXd3Li6fHTdrCrxKOSc0gV5icC5BdzUg6RopbG1wgK2+2qpc/S5NT6oLvFItnR/
/sQARRVE3NvTJOwZb3MDXKkPVniotsn1AUozB1g==</Data>
</Cred>
</Creds>
<Amount value="1.00" curr="NAD" />
</Payer>
<Payees>
<Payee addr="ree@mypsp" name="ree" seqNum="1" type="PERSON" code="0000" cmId="">
<Info>
<Identity type="ACCOUNT" verifiedName="narayanan" id="AAB45645BJB15" />
<Rating verifiedAddress="TRUE"></Rating>
</Info>

        Technical Specification Document                               302 | P a g e

<Device>
<Tag name="MOBILE" value="993456780" />
<Tag name="APP" value="org.npci.upi.maggi" />
<Tag name="TYPE" value="MOB" />
<Tag name="ID" value="0000000000000020" />
</Device>
<Ac addrType="ACCOUNT">
<Detail name="IFSC" value="AABY0000382" />
<Detail name="ACNUM" value="2678892001829" />
<Detail name="ACTYPE" value="SAVINGS" />
</Ac>
<Amount value="1.00" curr="NAD" />
</Payee>
</Payees>
</ReqPay>

Debit Response from Remitter SoV provider to IPS:

<RespPay>
    <Head ver="2.0" ts="2025-06-09T11:27:43+02:00" orgId="700001"
        msgId="XYA0000000001vRPtRSgrisL1lF9qiFS" />
    <Txn id="MYSIM00000001vRPtRTgqKswRQqezciI" note="test" refId="Ref"
        refUrl="https://www.sbi.co.in/" ts="2018-03-02T16:27:44+05:30" type="DEBIT"
        custRef="516011845328" initiationMode="00" subType="PAY" purpose="00">
        <RiskScores>
            <Score provider="psp1" type="TXNRISK" value="00032" />
            <Score provider="psp3" type="TXNRISK" value="00040" />
            <Score provider="NPCI" type="TXNRISK" value="00999" />
        </RiskScores>
    </Txn>
    <Resp reqMsgId="1xysViANcWdy" result="SUCCESS">
        <Ref type="PAYER" seqNum="1" addr="payer@mypsp" settAmount="1.00" settCurrency="NAD"
            approvalNum="654321" respCode="00" regName="Shyam" acNum="3453454385" IFSC="AABY0000382"

        Technical Specification Document                               303 | P a g e

code="0000" accType="SAVINGS" />
</Resp>
</RespPay>

Credit Request from IPS to Beneficiary SoV Provider: ReqPay with type “CREDIT”

<ReqPay>
    <Head ver="2.0" ts="2025-06-09T11:27:43+02:00" orgId="NPCI" msgId="1xysViANcWdA" />
    <Meta>
        <Tag name="PAYREQSTART" value="2017-12-04T14:15:35+05:30" />
        <Tag name="PAYREQEND" value="2017-12-04T14:15:35+05:30" />
    </Meta>
    <Txn id="MYSIM00000001vRPtRTgqKswRQqezciI" note="test" refId="Ref"
        refUrl="https://www.sbi.co.in/" ts="2018-03-02T16:27:44+05:30" type="CREDIT"
        custRef="516011845328" initiationMode="00" subType="PAY" purpose="00">
        <RiskScores>
            <Score provider="psp1" type="TXNRISK" value="00032" />
            <Score provider="psp3" type="TXNRISK" value="00040" />
            <Score provider="NPCI" type="TXNRISK" value="00999" />
        </RiskScores>
    </Txn>
    <Payer addr="payer@mypsp" name="Shyam" seqNum="1" type="PERSON" code="0000">
        <Info>
            <Identity type="PAN" verifiedName="Ram" id="SDF45645BJB22" />
            <Rating verifiedAddress="TRUE"></Rating>
        </Info>
        <Device>
            <Tag name="MOBILE" value="993456789" />
            <Tag name="TYPE" value="MOB" />
            <Tag name="ID" value="000000000000002" />
            <Tag name="OS" value="android" />
            <Tag name="APP" value="org.npci.upi.maggi" />
        </Device>
        <Ac addrType="ACCOUNT">

        Technical Specification Document                               304 | P a g e

<Detail name="IFSC" value="AABY0000382" />
<Detail name="ACTYPE" value="SAVINGS" />
<Detail name="ACNUM" value="3453454385" />
</Ac>
<Amount value="1.00" curr="NAD" />
</Payer>
<Payees>
<Payee addr="ree@mypsp" name="ree" seqNum="1" type="PERSON" code="0000" cmId="">
<Info>
<Identity type="ACCOUNT" verifiedName="narayanan" id="AAB45645BJB15" />
<Rating verifiedAddress="TRUE"></Rating>
</Info>
<Device>
<Tag name="MOBILE" value="993456780" />
<Tag name="APP" value="org.npci.upi.maggi" />
<Tag name="TYPE" value="MOB" />
<Tag name="ID" value="0000000000000020" />
</Device>
<Ac addrType="ACCOUNT">
<Detail name="IFSC" value="AABY0000382" />
<Detail name="ACNUM" value="2678892001829" />
<Detail name="ACTYPE" value="SAVINGS" />
</Ac>
<Amount value="1.00" curr="NAD" />
</Payee>
</Payees>
</ReqPay>

        Technical Specification Document                               305 | P a g e

Credit Response from Beneficiary SoV Provider to IPS :

<RespPay>
    <Head ver="2.0" ts="2025-06-09T11:27:43+02:00" orgId="700001"
        msgId="XYA0000000001vRPtRSgrisL1lF9uuOW" />
    <Txn id="MYSIM00000001vRPtRTgqKswRQqezciI" note="test" refId="Ref"
        refUrl="https://www.sbi.co.in/" ts="2018-03-02T16:27:44+05:30" type="CREDIT"
        custRef="516011845328" initiationMode="00" subType="PAY" purpose="00">
        <RiskScores>
            <Score provider="psp1" type="TXNRISK" value="00032" />
            <Score provider="psp3" type="TXNRISK" value="00040" />
            <Score provider="NPCI" type="TXNRISK" value="00999" />
        </RiskScores>
    </Txn>
    <Resp reqMsgId="1xysViANcWdA" result="SUCCESS">
        <Ref type="PAYEE" seqNum="1" addr="ree@mypsp" settAmount="1.00" settCurrency="NAD"
            approvalNum="654321" respCode="00" regName="ree" acNum="2678892001829"
            IFSC="AABY0000382" code="0000" accType="SAVINGS" />
    </Resp>
</RespPay>

Final ResPay request from IPS to Payer IPS Participant:

<RespPay>
    <Head ver="2.0" ts="2025-06-09T11:27:43+02:00" orgId="NPCI" msgId="1xysViANcWdC" />
    <Txn id="MYSIM00000001vRPtRTgqKswRQqezciI" note="test" refId="Ref"
        refUrl="https://www.sbi.co.in/" ts="2018-03-02T16:27:44+05:30" type="PAY"
        custRef="516011845328" initiationMode="00" purpose="00">
        <RiskScores>
            <Score provider="psp1" type="TXNRISK" value="00032" />
            <Score provider="psp3" type="TXNRISK" value="00040" />
            <Score provider="NPCI" type="TXNRISK" value="00999" />

        Technical Specification Document                               306 | P a g e

</RiskScores>
</Txn>
<Resp reqMsgId="XYD0000000000001GRDpegB9EWpFIHL7Tzs" result="SUCCESS">
<Ref type="PAYER" seqNum="1" addr="payer@mypsp" settAmount="1.00" settCurrency="NAD"
            approvalNum="654321" respCode="00" regName="Shyam" orgAmount="1.00" acNum="3453454385"
            IFSC="AABY0000382" code="0000" accType="SAVINGS" />
<Ref type="PAYEE" seqNum="1" addr="ree@mypsp" settAmount="1.00" settCurrency="NAD"
            approvalNum="654321" respCode="00" regName="ree" orgAmount="1.00" acNum="2678892001829"
            IFSC="AABY0000382" code="0000" accType="SAVINGS" cmId="" />
</Resp>
</RespPay>

Request TXn Confirmation from IPS to Payee IPS Participant:

<ReqTxnConfirmation>
    <Head ver="2.0" ts="2025-06-09T11:27:43+02:00" orgId="NPCI" msgId="1xysViANcWdF" />
    <Txn id="MYSIM00000001vRPtRTgqKswRQqezciI" note="test" refId="Ref"
        refUrl="https://www.sbi.co.in/" ts="2018-03-02T16:27:44+05:30" type="TxnConfirmation"
        orgTxnId="MYSIM00000001vRPtRTgqKswRQqezciI" custRef="516011845328" initiationMode="00"
        purpose="00" />
    <TxnConfirmation note="test" orgStatus="SUCCESS" type="PAY">
        <Ref type="PAYEE" seqNum="1" addr="ree@mypsp" settAmount="1.00" settCurrency="NAD"
            approvalNum="654321" respCode="00" regName="ree" orgAmount="1.00" acNum="2678892001829"
            IFSC="AABY0000382" code="0000" accType="SAVINGS" cmId="" />
    </TxnConfirmation>
</ReqTxnConfirmation>

        Technical Specification Document                               307 | P a g e

Response Txn Confirmation from Payee IPS Participant to IPS:

<RespTxnConfirmation>
    <Head ver="2.0" ts="2025-06-09T11:27:43+02:00" orgId="700001" msgId="3BIhGBUToMhIdZooU" />
    <Txn id="MYSIM00000001vRPtRTgqKswRQqezciI" note="test" refId="Ref"
        refUrl="https://www.sbi.co.in/"
        ts="2018-03-02T16:27:44+05:30" type="TxnConfirmation"
        orgTxnId="MYSIM00000001vRPtRTgqKswRQqezciI" custRef="516011845328" initiationMode="00"
        purpose="00" />
    <Resp reqMsgId="3BIhGBUToMhIdZooU" result="SUCCESS" />
</RespTxnConfirmation>

P2M :

Request from Payer IPS Participant to IPS: ReqPay with type = “DEBIT”

<ReqPay>
    <Head ver="2.0" ts="2025-06-05T09:14:03+02:00" orgId="700001"
        msgId="XYD0000000000001GRDpegB9EWpFIHL7Tzs" />
    <Meta>
        <Tag name="PAYREQSTART" value="2017-12-04T14:15:35+05:30" />
        <Tag name="PAYREQEND" value="2017-12-04T14:15:35+05:30" />
    </Meta>
    <Txn id="MYSIM00000001vRPtRTgqKswHNRgIyly" note="test" refId="Ref"
        refUrl="https://www.sbi.co.in/" ts="2018-03-02T16:27:44+05:30" type="PAY"
        custRef="515609473903" initiationMode="00" purpose="00">
        <RiskScores>
            <Score provider="psp1" type="TXNRISK" value="00032" />
            <Score provider="psp3" type="TXNRISK" value="00040" />
        </RiskScores>
    </Txn>
    <Payer addr="payer@mypsp" name="Shyam" seqNum="1" type="PERSON" code="0000">

        Technical Specification Document                               308 | P a g e

<Info>
<Identity type="PAN" verifiedName="Ram" id="SDF45645BJB22" />
<Rating verifiedAddress="TRUE"></Rating>
</Info>
<Device>
<Tag name="MOBILE" value="993456789" />
<Tag name="TYPE" value="MOB" />
<Tag name="ID" value="000000000000002" />
<Tag name="OS" value="android" />
<Tag name="APP" value="org.npci.upi.maggi" />
</Device>
<Ac addrType="ACCOUNT">
<Detail name="IFSC" value="AABY0000382" />
<Detail name="ACTYPE" value="SAVINGS" />
<Detail name="ACNUM" value="3453454385" />
</Ac>
<Creds>
<Cred type="PIN" subType="MPIN">
<Data code="NPCI"
ki="20150822">2.0|fMbMKk8O1ipA4NCF02Kr0ji1oq0P1hQhkaQFfQghQuE/qBcgbT54o+5aysAt6u1aw30VvTRXDzW7&#xd;
FKrKum3WkQtARhv6d1M00ZTVsle1irq7T6H59xB+ZFzc7PqBQucOvoYpRnKCXtO8WKM2n8WsiXx4&#xd;
MSeSKzpYP4fwTYW1YqKgUCwp3nMeFB+M+zektV2Y0IAodSgSps91yb3qMFGtaWu1VIrKK/wCrMtC&#xd;
xOTfP55tdUtGsR3QSoXhA3acErgjOz1fAjfcwwyPAcxMc3kATI0RHJGunQ4yzg0M0qA54V2P4tDw&#xd;
QHdeVx2ZN/lEL839wPepu/kaucMriM1KyNfcYA==&#xd;
</Data>
</Cred>
</Creds>
<Amount value="1.00" curr="NAD" />
</Payer>
<Payees>
<Payee addr="agath@mypsp" name="SonySuper" seqNum="1" type="ENTITY" code="5310" cmId="">
<Amount value="1.00" curr="NAD" />
<Merchant>
<Identifier subCode="1234" mid="123" sid="89311234567890122306" tid="8765987654"
merchantType="SMALL" merchantGenre="ONLINE" onBoardingType="AGGREGATOR"

        Technical Specification Document                               309 | P a g e

regId="AB12De" pinCode="507123" tier="TIER3" />
<Name brand="AllianceFranche" legal="Reliance" franchise="LearnFrench" />
<Ownership type="PUBLIC" />
<Invoice name="ramya" num="1" date="2020-05-30T07:06:06+05:30" />
</Merchant>
</Payee>
</Payees>
</ReqPay>

Request Auth Details from IPS to Payee IPS Participant:

<ReqAuthDetails>
    <Head ver="2.0" ts="2025-06-05T09:14:03+02:00" orgId="NPCI" msgId="1xysVbvTZB2F" />
    <Txn id="MYSIM00000001vRPtRTgqKswHNRgIyly" note="test" refId="Ref"
        refUrl="https://www.sbi.co.in/" ts="2018-03-02T16:27:44+05:30" type="PAY"
        custRef="515609473903" initiationMode="00" purpose="00">
        <RiskScores>
            <Score provider="psp1" type="TXNRISK" value="00032" />
            <Score provider="psp3" type="TXNRISK" value="00040" />
        </RiskScores>
    </Txn>
    <Payees>
        <Payee addr="agath@mypsp" name="SonySuper" seqNum="1" type="ENTITY" code="5310" cmId="">
            <Amount value="1.00" curr="NAD" />
            <Merchant>
                <Identifier subCode="1234" mid="123" sid="89311234567890122306" tid="8765987654"
                    merchantType="SMALL" merchantGenre="ONLINE" onBoardingType="AGGREGATOR"
                    regId="AB12De" pinCode="507123" tier="TIER3" />
                <Name brand="AllianceFranche" legal="Reliance" franchise="LearnFrench" />
                <Ownership type="PUBLIC" />
                <Invoice name="ramya" num="1" date="2020-05-30T07:06:06+05:30" />
            </Merchant>
        </Payee>

        Technical Specification Document                               310 | P a g e

</Payees>
<Payer addr="payer@mypsp" name="Shyam" seqNum="1" type="PERSON" code="0000">
<Info>
<Identity type="PAN" verifiedName="Ram" id="SDF45645BJB22" />
<Rating verifiedAddress="TRUE"></Rating>
</Info>
<Ac addrType="ACCOUNT">
<Detail name="IFSC" value="AABY0000382" />
<Detail name="ACTYPE" value="SAVINGS" />
<Detail name="ACNUM" value="3453454385" />
</Ac>
<Amount value="1.00" curr="NAD" />
</Payer>
</ReqAuthDetails>

Response Auth Details from Payee IPS Participant to IPS:

<RespAuthDetails>
    <Head ver="2.0" ts="2025-06-05T09:14:03.942+02:00" orgId="700001"
        msgId="XYA0000000000001vRPtRSgrisKRj5Y6fId" />
    <Resp reqMsgId="1xysVbvTZB2F" result="SUCCESS" />
    <Txn id="MYSIM00000001vRPtRTgqKswHNRgIyly" note="test" refId="Ref"
        refUrl="https://www.sbi.co.in/" ts="2018-03-02T16:27:44+05:30" type="PAY"
        custRef="515609473903" initiationMode="00" purpose="00">
        <RiskScores>
            <Score provider="SBI" type="TXNRISK" value="10" />
        </RiskScores>
    </Txn>
    <Payer addr="payer@mypsp" name="Shyam" seqNum="1" type="PERSON" code="0000">
        <Info>
            <Identity type="PAN" verifiedName="Ram" id="SDF45645BJB22" />
            <Rating verifiedAddress="TRUE"></Rating>
        </Info>

        Technical Specification Document                               311 | P a g e

<Ac addrType="ACCOUNT">
<Detail name="IFSC" value="AABY0000382" />
<Detail name="ACTYPE" value="SAVINGS" />
<Detail name="ACNUM" value="3453454385" />
</Ac>
<Amount value="1.00" curr="NAD" />
</Payer>
<Payees>
<Payee addr="agath@mypsp" name="SonySuper" seqNum="1" type="ENTITY" code="5310" cmId="">
<Info>
<Identity type="ACCOUNT" verifiedName="narayanan" id="AAB45645BJB15" />
<Rating verifiedAddress="TRUE"></Rating>
</Info>
<Device>
<Tag name="MOBILE" value="993456780" />
<Tag name="APP" value="org.npci.upi.maggi" />
<Tag name="TYPE" value="MOB" />
<Tag name="ID" value="0000000000000020" />
</Device>
<Ac addrType="ACCOUNT">
<Detail name="IFSC" value="AABY0000382" />
<Detail name="ACNUM" value="2678892001829" />
<Detail name="ACTYPE" value="SAVINGS" />
</Ac>
<Amount value="1.00" curr="NAD" />
<Merchant>
<Identifier subCode="1234" mid="123" sid="89311234567890122306" tid="8765987654"
                    merchantType="SMALL" merchantGenre="ONLINE" onBoardingType="AGGREGATOR"
                    regId="AB12De" pinCode="507123" tier="TIER3" />
<Name brand="AllianceFranche" legal="Reliance" franchise="LearnFrench" />
<Ownership type="PUBLIC" />
<Invoice name="ramya" num="1" date="2020-05-30T07:06:06+05:30" />
</Merchant>
</Payee>
</Payees>

        Technical Specification Document                               312 | P a g e

</RespAuthDetails>

Debit Request from IPS to Payer SoV Provider: ReqPay with type = “DEBIT”

<ReqPay>
    <Head ver="2.0" ts="2025-06-05T09:14:05+02:00" orgId="NPCI" msgId="1xysVbvU0r4x" />
    <Meta>
        <Tag name="PAYREQSTART" value="2017-12-04T14:15:35+05:30" />
        <Tag name="PAYREQEND" value="2017-12-04T14:15:35+05:30" />
    </Meta>
    <Txn id="MYSIM00000001vRPtRTgqKswHNRgIyly" note="test" refId="Ref"
        refUrl="https://www.sbi.co.in/" ts="2018-03-02T16:27:44+05:30" type="DEBIT"
        custRef="515609473903" initiationMode="00" subType="PAY" purpose="00">
        <RiskScores>
            <Score provider="psp1" type="TXNRISK" value="00032" />
            <Score provider="psp3" type="TXNRISK" value="00040" />
            <Score provider="NPCI" type="TXNRISK" value="00999" />
        </RiskScores>
    </Txn>
    <Payer addr="payer@mypsp" name="Shyam" seqNum="1" type="PERSON" code="0000">
        <Info>
            <Identity type="PAN" verifiedName="Ram" id="SDF45645BJB22" />
            <Rating verifiedAddress="TRUE"></Rating>
        </Info>
        <Device>
            <Tag name="MOBILE" value="993456789" />
            <Tag name="TYPE" value="MOB" />
            <Tag name="ID" value="000000000000002" />
            <Tag name="OS" value="android" />
            <Tag name="APP" value="org.npci.upi.maggi" />
        </Device>
        <Ac addrType="ACCOUNT">
            <Detail name="IFSC" value="AABY0000382" />

        Technical Specification Document                               313 | P a g e

<Detail name="ACTYPE" value="SAVINGS" />
<Detail name="ACNUM" value="3453454385" />
</Ac>
<Creds>
<Cred type="PIN" subType="MPIN">
<Data code="700001" ki="20181226">

q5f/muRNF2osOl785TNFAVdMaUw2THOAZyg2ss9fy5MoO+3z86WD/wdS1iQmhfiPBn2sVooqp35q4QFdUej2QSvUT/ximKmXvyx1U
hZ0G7aPt5GGKStaEaV8E+MHVGrC0u9atFqF/mxXJzwVQYWCCdqCVplRDhpDnyeg+0hJbFu8dMNeR7ut3cvDwvdvMY4F1n2RMXu7gT
p0dduUk7vKndbl/Z3SKMkrWWLAfUP/9jWDIVPZfy0ZgHTTX3xooX2NrRojvjP9e36I6j2OkCENP8B0v/RgozkX36XdjxkoSBoQclt
zZojKKY4VfMitCHwgpxIn86SqaSEEI8eHZ/qlDw==</Data>
</Cred>
</Creds>
<Amount value="1.00" curr="NAD" />
</Payer>
<Payees>
<Payee addr="agath@mypsp" name="SonySuper" seqNum="1" type="ENTITY" code="5310" cmId="">
<Info>
<Identity type="ACCOUNT" verifiedName="narayanan" id="AAB45645BJB15" />
<Rating verifiedAddress="TRUE"></Rating>
</Info>
<Device>
<Tag name="MOBILE" value="993456780" />
<Tag name="APP" value="org.npci.upi.maggi" />
<Tag name="TYPE" value="MOB" />
<Tag name="ID" value="0000000000000020" />
</Device>
<Ac addrType="ACCOUNT">
<Detail name="IFSC" value="AABY0000382" />
<Detail name="ACNUM" value="2678892001829" />
<Detail name="ACTYPE" value="SAVINGS" />
</Ac>
<Amount value="1.00" curr="NAD" />
<Merchant>
<Identifier subCode="1234" mid="123" sid="89311234567890122306" tid="8765987654"

        Technical Specification Document                               314 | P a g e

merchantType="SMALL" merchantGenre="ONLINE" onBoardingType="AGGREGATOR"
regId="AB12De" pinCode="507123" tier="TIER3" />
<Name brand="AllianceFranche" legal="Reliance" franchise="LearnFrench" />
<Ownership type="PUBLIC" />
<Invoice name="ramya" num="1" date="2020-05-30T07:06:06+05:30" />
</Merchant>
</Payee>
</Payees>
</ReqPay>

Response from Payer IPS Participant to IPS:
<RespPay>
<Head ver="2.0" ts="2025-06-05T09:14:06+02:00" orgId="700001"
        msgId="XYA0000000001vRPtRSgrisKRj6c83UA" />
<Txn id="MYSIM00000001vRPtRTgqKswHNRgIyly" note="test" refId="Ref"
        refUrl="https://www.sbi.co.in/" ts="2018-03-02T16:27:44+05:30" type="DEBIT"
        custRef="515609473903" initiationMode="00" subType="PAY" purpose="00">
<RiskScores>
<Score provider="psp1" type="TXNRISK" value="00032" />
<Score provider="psp3" type="TXNRISK" value="00040" />
<Score provider="NPCI" type="TXNRISK" value="00999" />
</RiskScores>
</Txn>
<Resp reqMsgId="1xysVbvU0r4x" result="SUCCESS">
<Ref type="PAYER" seqNum="1" addr="payer@mypsp" settAmount="1.00" settCurrency="NAD"
            approvalNum="654321" respCode="00" regName="Shyam" acNum="3453454385" IFSC="AABY0000382"
            code="0000" accType="SAVINGS" />
</Resp>
</RespPay>

        Technical Specification Document                               315 | P a g e

Credit Request from IPS to Payee Sov Provider: ReqPayr with type = “CREDIT’

<ReqPay>
    <Head ver="2.0" ts="2025-06-05T09:14:06+02:00" orgId="NPCI" msgId="1xysVbvU0R5t" />
    <Meta>
        <Tag name="PAYREQSTART" value="2017-12-04T14:15:35+05:30" />
        <Tag name="PAYREQEND" value="2017-12-04T14:15:35+05:30" />
    </Meta>
    <Txn id="MYSIM00000001vRPtRTgqKswHNRgIyly" note="test" refId="Ref"
        refUrl="https://www.sbi.co.in/" ts="2018-03-02T16:27:44+05:30" type="CREDIT"
        custRef="515609473903" initiationMode="00" subType="PAY" purpose="00">
        <RiskScores>
            <Score provider="psp1" type="TXNRISK" value="00032" />
            <Score provider="psp3" type="TXNRISK" value="00040" />
            <Score provider="NPCI" type="TXNRISK" value="00999" />
        </RiskScores>
    </Txn>
    <Payer addr="payer@mypsp" name="Shyam" seqNum="1" type="PERSON" code="0000">
        <Info>
            <Identity type="PAN" verifiedName="Ram" id="SDF45645BJB22" />
            <Rating verifiedAddress="TRUE"></Rating>
        </Info>
        <Device>
            <Tag name="MOBILE" value="993456789" />
            <Tag name="TYPE" value="MOB" />
            <Tag name="ID" value="000000000000002" />
            <Tag name="OS" value="android" />
            <Tag name="APP" value="org.npci.upi.maggi" />
        </Device>
        <Ac addrType="ACCOUNT">
            <Detail name="IFSC" value="AABY0000382" />
            <Detail name="ACTYPE" value="SAVINGS" />
            <Detail name="ACNUM" value="3453454385" />
        </Ac>
        <Amount value="1.00" curr="NAD" />

        Technical Specification Document                               316 | P a g e

</Payer>
<Payees>
<Payee addr="agath@mypsp" name="SonySuper" seqNum="1" type="ENTITY" code="5310" cmId="">
<Info>
<Identity type="ACCOUNT" verifiedName="narayanan" id="AAB45645BJB15" />
<Rating verifiedAddress="TRUE"></Rating>
</Info>
<Device>
<Tag name="MOBILE" value="993456780" />
<Tag name="APP" value="org.npci.upi.maggi" />
<Tag name="TYPE" value="MOB" />
<Tag name="ID" value="0000000000000020" />
</Device>
<Ac addrType="ACCOUNT">
<Detail name="IFSC" value="AABY0000382" />
<Detail name="ACNUM" value="2678892001829" />
<Detail name="ACTYPE" value="SAVINGS" />
</Ac>
<Amount value="1.00" curr="NAD" />
<Merchant>
<Identifier subCode="1234" mid="123" sid="89311234567890122306" tid="8765987654"
                    merchantType="SMALL" merchantGenre="ONLINE" onBoardingType="AGGREGATOR"
                    regId="AB12De" pinCode="507123" tier="TIER3" />
<Name brand="AllianceFranche" legal="Reliance" franchise="LearnFrench" />
<Ownership type="PUBLIC" />
<Invoice name="ramya" num="1" date="2020-05-30T07:06:06+05:30" />
</Merchant>
</Payee>
</Payees>
</ReqPay>

        Technical Specification Document                               317 | P a g e

Response from Payee IPS participant to IPS :

<RespPay>
    <Head ver="2.0" ts="2025-06-05T09:14:06+02:00" orgId="700001"
        msgId="XYA0000000001vRPtRSgrisKRj6clUoq" />
    <Txn id="MYSIM00000001vRPtRTgqKswHNRgIyly" note="test" refId="Ref"
        refUrl="https://www.sbi.co.in/" ts="2018-03-02T16:27:44+05:30" type="CREDIT"
        custRef="515609473903" initiationMode="00" subType="PAY" purpose="00">
        <RiskScores>
            <Score provider="psp1" type="TXNRISK" value="00032" />
            <Score provider="psp3" type="TXNRISK" value="00040" />
            <Score provider="NPCI" type="TXNRISK" value="00999" />
        </RiskScores>
    </Txn>
    <Resp reqMsgId="1xysVbvU0R5t" result="SUCCESS">
        <Ref type="PAYEE" seqNum="1" addr="agath@mypsp" settAmount="1.00" settCurrency="NAD"
            approvalNum="654321" respCode="00" regName="SonySuper" acNum="2678892001829"
            IFSC="AABY0000382" code="0000" accType="SAVINGS" />
    </Resp>
</RespPay>

Final Response Pay from IPS to Payer IPS Participant:

<RespPay>
    <Head ver="2.0" ts="2025-06-05T09:14:06+02:00" orgId="NPCI" msgId="1xysVbvU0R5v" />
    <Txn id="MYSIM00000001vRPtRTgqKswHNRgIyly" note="test" refId="Ref"
        refUrl="https://www.sbi.co.in/" ts="2018-03-02T16:27:44+05:30" type="PAY"
        custRef="515609473903" initiationMode="00" purpose="00">
        <RiskScores>
            <Score provider="psp1" type="TXNRISK" value="00032" />
            <Score provider="psp3" type="TXNRISK" value="00040" />
            <Score provider="NPCI" type="TXNRISK" value="00999" />
        </RiskScores>
    </Txn>

        Technical Specification Document                               318 | P a g e

<Resp reqMsgId="XYD0000000000001GRDpegB9EWpFIHL7Tzs" result="SUCCESS">
<Ref type="PAYER" seqNum="1" addr="payer@mypsp" settAmount="1.00" settCurrency="NAD"
            approvalNum="654321" respCode="00" regName="Shyam" orgAmount="1.00" acNum="3453454385"
            IFSC="AABY0000382" code="0000" accType="SAVINGS" />
<Ref type="PAYEE" seqNum="1" addr="agath@mypsp" settAmount="1.00" settCurrency="NAD"
            approvalNum="654321" respCode="00" regName="SonySuper" orgAmount="1.00"
            acNum="2678892001829" IFSC="AABY0000382" code="5310" accType="SAVINGS" cmId="" />
</Resp>
</RespPay>

Req Txn Confirmation from IPS to Payee IPS Participant:

<ReqTxnConfirmation>
    <Head ver="2.0" ts="2025-06-05T09:14:06+02:00" orgId="NPCI" msgId="1xysVbvU0R5y" />
    <Txn id="MYSIM00000001vRPtRTgqKswHNRgIyly" note="test" refId="Ref"
        refUrl="https://www.sbi.co.in/" ts="2018-03-02T16:27:44+05:30" type="TxnConfirmation"
        orgTxnId="MYSIM00000001vRPtRTgqKswHNRgIyly" custRef="515609473903" initiationMode="00"
        purpose="00" />
    <TxnConfirmation note="test" orgStatus="SUCCESS" type="PAY">
        <Ref type="PAYEE" seqNum="1" addr="agath@mypsp" settAmount="1.00" settCurrency="NAD"
            approvalNum="654321" respCode="00" regName="SonySuper" orgAmount="1.00"
            acNum="2678892001829" IFSC="AABY0000382" code="5310" accType="SAVINGS" cmId="" />
    </TxnConfirmation>
</ReqTxnConfirmation>

Response Txn Confirmation from Payee IPS Participant to IPS:

<RespTxnConfirmation>
    <Head ver="2.0" ts="2025-06-05T09:14:06+02:00" orgId="700001" msgId="3BIhGBUToCf9h3Oqm" />
    <Txn id="MYSIM00000001vRPtRTgqKswHNRgIyly" note="test" refId="Ref"
        refUrl="https://www.sbi.co.in/" ts="2018-03-02T16:27:44+05:30" type="TxnConfirmation"
        orgTxnId="MYSIM00000001vRPtRTgqKswHNRgIyly" custRef="515609473903" initiationMode="00"
        purpose="00" />

        Technical Specification Document                               319 | P a g e

<Resp reqMsgId="3BIhGBUToCf9h3Oqm" result="SUCCESS" />
</RespTxnConfirmation>

6.18. G2P Transaction

Refer Specifications

Request from IPS Payer Participants to IPS:

<ReqPay>
    <Head ver="2.0" ts="2025-06-02T08:41:24+02:00" orgId="700001"
        msgId="XYD0000000000001GRDpegB9EWpFIHL7Tzs" prodType=”UPI”/>
    <Meta>
        <Tag name="PAYREQSTART" value="2017-12-04T14:15:35+05:30" />
        <Tag name="PAYREQEND" value="2017-12-04T14:15:35+05:30" />
    </Meta>
    <Txn id="MYSIM00000001vRPtRTgqKswAo4B4R32" note="test" refId="Ref"
        refUrl="https://www.sbi.co.in/" ts="2018-03-02T16:27:44+05:30" type="PAY"
        custRef="515308298018" initiationMode="00" purpose="14">
        <RiskScores>
            <Score provider="psp1" type="TXNRISK" value="00032" />
            <Score provider="psp3" type="TXNRISK" value="00040" />
        </RiskScores>
    </Txn>
    <Payer addr="PRE@mypsp" name="Shyam" seqNum="1" type="PERSON" code="0000">
        <Info>
            <Identity type="PAN" verifiedName="Ram" id="SDF45645BJB22" />
            <Rating verifiedAddress="TRUE"></Rating>
        </Info>
        <Device>
            <Tag name="MOBILE" value="993456789" />
            <Tag name="TYPE" value="MOB" />

        Technical Specification Document                               320 | P a g e

<Tag name="ID" value="000000000000002" />
<Tag name="OS" value="android" />
<Tag name="APP" value="org.npci.upi.maggi" />
</Device>
<Ac addrType="ACCOUNT">
<Detail name="IFSC" value="AABY0000382" />
<Detail name="ACTYPE" value="SAVINGS" />
<Detail name="ACNUM" value="3453454385" />
</Ac>
<Creds>
<Cred type="PreApproved" subType="NA">
<Data code="NPCI" ki="20150822">MDB8MTIzNDU2</Data>
</Cred>
</Creds>
<Amount value="1.00" curr="NAD" />
</Payer>
<Payees>
<Payee addr="2678892001829@AABY0000382.ifsc.npci" name="SonySuper" seqNum="1" type="PERSON"
            code="0000" cmId="">
<Amount value="1.00" curr="NAD" />
</Payee>
</Payees>
</ReqPay>

Credit Request to Payee IPS Participants from IPS:

<ReqPay>
    <Head ver="2.0" ts="2025-06-02T08:41:26+02:00" orgId="NPCI" msgId="1xysV6dwHEEP" />
    <Meta>
        <Tag name="PAYREQSTART" value="2017-12-04T14:15:35+05:30" />
        <Tag name="PAYREQEND" value="2017-12-04T14:15:35+05:30" />
    </Meta>
    <Txn id="MYSIM00000001vRPtRTgqKswAo4B4R32" note="test" refId="Ref"
        refUrl="https://www.sbi.co.in/" ts="2018-03-02T16:27:44+05:30" type="CREDIT"
        custRef="515308298018" initiationMode="00" subType="PAY" purpose="14">

        Technical Specification Document                               321 | P a g e

<RiskScores>
<Score provider="psp1" type="TXNRISK" value="00032" />
<Score provider="psp3" type="TXNRISK" value="00040" />
<Score provider="NPCI" type="TXNRISK" value="00999" />
</RiskScores>
</Txn>
<Payer addr="PRE@mypsp" name="Shyam" seqNum="1" type="PERSON" code="0000">
<Info>
<Identity type="PAN" verifiedName="Ram" id="SDF45645BJB22" />
<Rating verifiedAddress="TRUE"></Rating>
</Info>
<Device>
<Tag name="MOBILE" value="993456789" />
<Tag name="TYPE" value="MOB" />
<Tag name="ID" value="000000000000002" />
<Tag name="OS" value="android" />
<Tag name="APP" value="org.npci.upi.maggi" />
</Device>
<Ac addrType="ACCOUNT">
<Detail name="IFSC" value="AABY0000382" />
<Detail name="ACTYPE" value="SAVINGS" />
<Detail name="ACNUM" value="3453454385" />
</Ac>
<Amount value="1.00" curr="NAD" />
</Payer>
<Payees>
<Payee addr="2678892001829@AABY0000382.ifsc.npci" name="SonySuper" seqNum="1" type="PERSON"
            code="0000" cmId="">
<Ac addrType="ACCOUNT">
<Detail name="ACNUM" value="2678892001829" />
<Detail name="ACTYPE" value="DEFAULT" />
<Detail name="IFSC" value="AABY0000382" />
</Ac>
<Amount value="1.00" curr="NAD" />
</Payee>

        Technical Specification Document                               322 | P a g e

</Payees>
</ReqPay>

Credit Response from Payee IPS Participants to IPS:

<RespPay>
    <Head ver="2.0" ts="2025-06-02T08:41:26+02:00" orgId="700001"
        msgId="null000000001vRPtRSgrisKJTjvGQTv" />
    <Txn id="MYSIM00000001vRPtRTgqKswAo4B4R32" note="test" refId="Ref"
        refUrl="https://www.sbi.co.in/" ts="2018-03-02T16:27:44+05:30" type="CREDIT"
        custRef="515308298018" initiationMode="00" subType="PAY" purpose="14">
        <RiskScores>
            <Score provider="psp1" type="TXNRISK" value="00032" />
            <Score provider="psp3" type="TXNRISK" value="00040" />
            <Score provider="NPCI" type="TXNRISK" value="00999" />
        </RiskScores>
    </Txn>
    <Resp reqMsgId="1xysV6dwHEEP" result="SUCCESS">
        <Ref type="PAYEE" seqNum="1" addr="2678892001829@AABY0000382.ifsc.npci" settAmount="1.00"
            settCurrency="NAD" approvalNum="654321" respCode="00" regName="SonySuper"
            acNum="2678892001829" IFSC="AABY0000382" code="0000" accType="DEFAULT" />
    </Resp>
</RespPay>

Final Response to Payer IPS Participant from IPS:

<RespPay>
    <Head ver="2.0" ts="2025-06-02T08:41:26+02:00" orgId="NPCI" msgId="1xysV6dwHEER" />
    <Txn id="MYSIM00000001vRPtRTgqKswAo4B4R32" note="test" refId="Ref"
        refUrl="https://www.sbi.co.in/" ts="2018-03-02T16:27:44+05:30" type="PAY"
        custRef="515308298018" initiationMode="00" purpose="14">
        <RiskScores>
            <Score provider="psp1" type="TXNRISK" value="00032" />
            <Score provider="psp3" type="TXNRISK" value="00040" />

        Technical Specification Document                               323 | P a g e

<Score provider="NPCI" type="TXNRISK" value="00999" />
</RiskScores>
</Txn>
<Resp reqMsgId="XYD0000000000001GRDpegB9EWpFIHL7Tzs" result="SUCCESS">
<Ref type="PAYER" seqNum="1" addr="PRE@mypsp" settAmount="1.00" settCurrency="NAD"
            approvalNum="123456" respCode="00" regName="Ram" orgAmount="1.00" acNum="3453454385"
            IFSC="AABY0000382" code="0000" accType="SAVINGS" />
<Ref type="PAYEE" seqNum="1" addr="2678892001829@AABY0000382.ifsc.npci" settAmount="1.00"
            settCurrency="NAD" approvalNum="654321" respCode="00" regName="SonySuper"
            orgAmount="1.00" acNum="2678892001829" code="0000" cmId="" />
</Resp>
</RespPay>

6.19. Merchant Cash In – Pay by Alias

Refer Specifications Pay API

Request from Payer IPS Participant to IPS: ReqPay - PAY

<ReqPay>
    <Head ver="2.0" ts="2025-06-11T06:40:56+02:00" orgId="700001"
        msgId="XYD0000000000001GRDpegB9EWpFIHL7Tzs" prodType="UPI" />
    <Meta>
        <Tag name="PAYREQSTART" value="2017-12-04T14:15:35+05:30" />
        <Tag name="PAYREQEND" value="2017-12-04T14:15:35+05:30" />
    </Meta>
    <Txn id="MYSIM00000001vRPtRTgqKswWgm6RcQw" note="test" refId="Ref"
        refUrl="https://www.sbi.co.in/" ts="2018-03-02T16:27:44+05:30" type="PAY"
        custRef="516206118970" initiationMode="00" purpose="12">
        <RiskScores>
            <Score provider="psp1" type="TXNRISK" value="00032" />
            <Score provider="psp3" type="TXNRISK" value="00040" />
        </RiskScores>

        Technical Specification Document                               324 | P a g e

</Txn>
<Payer addr="payer@mypsp" name="Shyam" seqNum="1" type="PERSON" code="0000">
<Info>
<Identity type="PAN" verifiedName="Ram" id="SDF45645BJB22" />
<Rating verifiedAddress="TRUE"></Rating>
</Info>
<Device>
<Tag name="MOBILE" value="993456789" />
<Tag name="TYPE" value="MOB" />
<Tag name="ID" value="000000000000002" />
<Tag name="OS" value="android" />
<Tag name="APP" value="org.npci.upi.maggi" />
</Device>
<Ac addrType="ACCOUNT">
<Detail name="IFSC" value="AABY0000382" />
<Detail name="ACTYPE" value="SAVINGS" />
<Detail name="ACNUM" value="3453454385" />
</Ac>
<Creds>
<Cred type="PIN" subType="MPIN">
<Data code="NPCI"
ki="20150822">2.0|Iq+eCfIxetz3PNmTM4F1NrVUyqF4RboHsOLtkrjxlT2v9cmhCYXpFnnC0TmfHS4PxdKJlQgL/FfN&#x
d;7ZIfU0vDUmB/ZDEt7bZ2Lc9moveEHlC6iMMtF0fmKe8cgJ8s+T+qK/kKtdW7+iW0PF2EArknXHU+&#xd;
Ld6W/8g1udVs5wvHYm+nmuOyhbOf24oux3WPpmjS/DCRKo4aEwJ70chE0SkI8voqOetLUXEdXre2&#xd;
nvR+7LdPqBdGVhi62TbufIxctc+pvcyl4SxKzw+vSS335cPjJc5VhAvUhkeOn84uGkHKK+dLLr4g&#xd;
0RMfbq2AdRzzyizJ+Yh3FXT7Q9BppIPsGXZ62A==&#xd;
</Data>
</Cred>
</Creds>
<Amount value="1.00" curr="NAD" />
</Payer>
<Payees>
<Payee addr="agath@mypsp" name="ree" seqNum="1" type="PERSON" code="0000" cmId="">
<Amount value="1.00" curr="NAD" />
</Payee>

        Technical Specification Document                               325 | P a g e

</Payees>
</ReqPay>

Request from IPS to Payee IPS Participant: ReqAuthDetails

<ReqAuthDetails>
    <Head ver="2.0" ts="2025-06-11T06:40:56+02:00" orgId="NPCI" msgId="1xysVm1JlAi0" />
    <Txn id="MYSIM00000001vRPtRTgqKswWgm6RcQw" note="test" refId="Ref"
        refUrl="https://www.sbi.co.in/" ts="2018-03-02T16:27:44+05:30" type="PAY"
        custRef="516206118970" initiationMode="00" purpose="12">
        <RiskScores>
            <Score provider="psp1" type="TXNRISK" value="00032" />
            <Score provider="psp3" type="TXNRISK" value="00040" />
        </RiskScores>
    </Txn>
    <Payees>
        <Payee addr="agath@mypsp" name="ree" seqNum="1" type="PERSON" code="0000" cmId="">
            <Amount value="1.00" curr="NAD" />
        </Payee>
    </Payees>
    <Payer addr="payer@mypsp" name="Shyam" seqNum="1" type="PERSON" code="0000">
        <Info>
            <Identity type="PAN" verifiedName="Ram" id="SDF45645BJB22" />
            <Rating verifiedAddress="TRUE"></Rating>
        </Info>
        <Ac addrType="ACCOUNT">
            <Detail name="IFSC" value="AABY0000382" />
            <Detail name="ACTYPE" value="SAVINGS" />
            <Detail name="ACNUM" value="3453454385" />
        </Ac>
        <Amount value="1.00" curr="NAD" />
    </Payer>
</ReqAuthDetails>

        Technical Specification Document                               326 | P a g e

Response from Payee IPS Participant to IPS: RespAuthDetails

<RespAuthDetails>
    <Head ver="2.0" ts="2025-06-11T06:40:56.551+02:00" orgId="700001"
        msgId="XYA0000000000001vRPtRSgrisL5LANW1z5" />
    <Resp reqMsgId="1xysVm1JlAi0" result="SUCCESS" />
    <Txn id="MYSIM00000001vRPtRTgqKswWgm6RcQw" note="test" refId="Ref"
        refUrl="https://www.sbi.co.in/" ts="2018-03-02T16:27:44+05:30" type="PAY"
        custRef="516206118970" initiationMode="00" purpose="12">
        <RiskScores>
            <Score provider="SBI" type="TXNRISK" value="10" />
        </RiskScores>
    </Txn>
    <Payer addr="payer@mypsp" name="Shyam" seqNum="1" type="PERSON" code="0000">
        <Info>
            <Identity type="PAN" verifiedName="Ram" id="SDF45645BJB22" />
            <Rating verifiedAddress="TRUE"></Rating>
        </Info>
        <Ac addrType="ACCOUNT">
            <Detail name="IFSC" value="AABY0000382" />
            <Detail name="ACTYPE" value="SAVINGS" />
            <Detail name="ACNUM" value="3453454385" />
        </Ac>
        <Amount value="1.00" curr="NAD" />
    </Payer>
    <Payees>
        <Payee addr="agath@mypsp" name="ree" seqNum="1" type="PERSON" code="0000" cmId="">
            <Info>
                <Identity type="ACCOUNT" verifiedName="narayanan" id="AAB45645BJB15" />
                <Rating verifiedAddress="TRUE"></Rating>
            </Info>
            <Device>
                <Tag name="MOBILE" value="993456780" />
                <Tag name="APP" value="org.npci.upi.maggi" />
                <Tag name="TYPE" value="MOB" />

        Technical Specification Document                               327 | P a g e

<Tag name="ID" value="0000000000000020" />
</Device>
<Ac addrType="ACCOUNT">
<Detail name="IFSC" value="AABY0000382" />
<Detail name="ACNUM" value="2678892001829" />
<Detail name="ACTYPE" value="SAVINGS" />
</Ac>
<Amount value="1.00" curr="NAD" />
</Payee>
</Payees>
</RespAuthDetails>

Debit Request from IPS to Merchant Sov Provider: ReqPay – DEBIT

<ReqPay>
    <Head ver="2.0" ts="2025-06-11T06:40:58+02:00" orgId="NPCI" msgId="1xysVm1JmqjS" />
    <Meta>
        <Tag name="PAYREQSTART" value="2017-12-04T14:15:35+05:30" />
        <Tag name="PAYREQEND" value="2017-12-04T14:15:35+05:30" />
    </Meta>
    <Txn id="MYSIM00000001vRPtRTgqKswWgm6RcQw" note="test" refId="Ref"
        refUrl="https://www.sbi.co.in/" ts="2018-03-02T16:27:44+05:30" type="DEBIT"
        custRef="516206118970" initiationMode="00" subType="PAY" purpose="12">
        <RiskScores>
            <Score provider="psp1" type="TXNRISK" value="00032" />
            <Score provider="psp3" type="TXNRISK" value="00040" />
            <Score provider="NPCI" type="TXNRISK" value="00999" />
        </RiskScores>
    </Txn>
    <Payer addr="payer@mypsp" name="Shyam" seqNum="1" type="PERSON" code="0000">
        <Info>
            <Identity type="PAN" verifiedName="Ram" id="SDF45645BJB22" />

        Technical Specification Document                               328 | P a g e

<Rating verifiedAddress="TRUE"></Rating>
</Info>
<Device>
<Tag name="MOBILE" value="993456789" />
<Tag name="TYPE" value="MOB" />
<Tag name="ID" value="000000000000002" />
<Tag name="OS" value="android" />
<Tag name="APP" value="org.npci.upi.maggi" />
</Device>
<Ac addrType="ACCOUNT">
<Detail name="IFSC" value="AABY0000382" />
<Detail name="ACTYPE" value="SAVINGS" />
<Detail name="ACNUM" value="3453454385" />
</Ac>
<Creds>
<Cred type="PIN" subType="MPIN">
<Data code="700001" ki="20160217">
VRZoY+H0XotFLjRFAYLYr9/tmp//WExT3txT5TvIpu8o7qO4s3L7UmMel9ME6mNIaQWIBzjMxYeXlZfjVDTN4cbmkhMKykQb0
9SaAhwhAAIaNKPuXAslY833qigcEPQty8mmw3VIhaj9xYxjoWgeOwKg0ChgVlol+XZlHw3qlYgI3Qh9IdopNJWW2rIoH6OGkd
5XSX+InxNIr1QUfajlUwRT8sexA6phLulIMkLRHV6VwgQSj3MnZnn0GkPrA7mgX/ixixcxDJVkzo/LkM2WoOCf9Vcu/JNyj8D
dkbVVbly9Lxt0T3+c9mGdhUyy+tZ7aeGbmCuKvr6tyXMh86XBHg==</Data>
</Cred>
</Creds>
<Amount value="1.00" curr="NAD" />
</Payer>
<Payees>
<Payee addr="agath@mypsp" name="ree" seqNum="1" type="PERSON" code="0000" cmId="">
<Info>
<Identity type="ACCOUNT" verifiedName="narayanan" id="AAB45645BJB15" />
<Rating verifiedAddress="TRUE"></Rating>
</Info>
<Device>
<Tag name="MOBILE" value="993456780" />
<Tag name="APP" value="org.npci.upi.maggi" />
<Tag name="TYPE" value="MOB" />

        Technical Specification Document                               329 | P a g e

<Tag name="ID" value="0000000000000020" />
</Device>
<Ac addrType="ACCOUNT">
<Detail name="IFSC" value="AABY0000382" />
<Detail name="ACNUM" value="2678892001829" />
<Detail name="ACTYPE" value="SAVINGS" />
</Ac>
<Amount value="1.00" curr="NAD" />
</Payee>
</Payees>
</ReqPay>

Debit Response from Merchant Sov Provider to IPS: RespPay – DEBIT

<RespPay>
    <Head ver="2.0" ts="2025-06-11T06:40:58+02:00" orgId="700001"
        msgId="XYA0000000001vRPtRSgrisL5LB1JZhE" prodTYpe=”UPI” />
    <Txn id="MYSIM00000001vRPtRTgqKswWgm6RcQw" note="test" refId="Ref"
        refUrl="https://www.sbi.co.in/" ts="2018-03-02T16:27:44+05:30" type="DEBIT"
        custRef="516206118970" initiationMode="00" subType="PAY" purpose="12">
        <RiskScores>
            <Score provider="psp1" type="TXNRISK" value="00032" />
            <Score provider="psp3" type="TXNRISK" value="00040" />
            <Score provider="NPCI" type="TXNRISK" value="00999" />
        </RiskScores>
    </Txn>
    <Resp reqMsgId="1xysVm1JmqjS" result="SUCCESS">
        <Ref type="PAYER" seqNum="1" addr="payer@mypsp" settAmount="1.00" settCurrency="NAD"
   approvalNum="654321" respCode="00" regName="Shyam" acNum="3453454385"
IFSC="AABY0000382" code="0000" accType="SAVINGS" />

    </Resp>

</RespPay>

        Technical Specification Document                               330 | P a g e

Credit Request from IPS to Beneficary SoV Provider: ReqPay- Credit

<ReqPay>

<Head ver="2.0" ts="2025-06-11T06:40:58+02:00" orgId="NPCI" msgId="1xysVm1JmqjU" prodType=”UPI”

/>
<Meta>
<Tag name="PAYREQSTART" value="2017-12-04T14:15:35+05:30" />
<Tag name="PAYREQEND" value="2017-12-04T14:15:35+05:30" />
</Meta>
<Txn id="MYSIM00000001vRPtRTgqKswWgm6RcQw" note="test" refId="Ref"
        refUrl="https://www.sbi.co.in/" ts="2018-03-02T16:27:44+05:30" type="CREDIT"
        custRef="516206118970" initiationMode="00" subType="PAY" purpose="12">
<RiskScores>
<Score provider="psp1" type="TXNRISK" value="00032" />
<Score provider="psp3" type="TXNRISK" value="00040" />
<Score provider="NPCI" type="TXNRISK" value="00999" />
</RiskScores>
</Txn>
<Payer addr="payer@mypsp" name="Shyam" seqNum="1" type="PERSON" code="0000">
<Info>
<Identity type="PAN" verifiedName="Ram" id="SDF45645BJB22" />
<Rating verifiedAddress="TRUE"></Rating>
</Info>
<Device>
<Tag name="MOBILE" value="993456789" />
<Tag name="TYPE" value="MOB" />
<Tag name="ID" value="000000000000002" />
<Tag name="OS" value="android" />
<Tag name="APP" value="org.npci.upi.maggi" />
</Device>
<Ac addrType="ACCOUNT">
<Detail name="IFSC" value="AABY0000382" />
<Detail name="ACTYPE" value="SAVINGS" />
<Detail name="ACNUM" value="3453454385" />

        Technical Specification Document                               331 | P a g e

</Ac>
<Amount value="1.00" curr="NAD" />
</Payer>
<Payees>
<Payee addr="agath@mypsp" name="ree" seqNum="1" type="PERSON" code="0000" cmId="">
<Info>
<Identity type="ACCOUNT" verifiedName="narayanan" id="AAB45645BJB15" />
<Rating verifiedAddress="TRUE"></Rating>
</Info>
<Device>
<Tag name="MOBILE" value="993456780" />
<Tag name="APP" value="org.npci.upi.maggi" />
<Tag name="TYPE" value="MOB" />
<Tag name="ID" value="0000000000000020" />
</Device>
<Ac addrType="ACCOUNT">
<Detail name="IFSC" value="AABY0000382" />
<Detail name="ACNUM" value="2678892001829" />
<Detail name="ACTYPE" value="SAVINGS" />
</Ac>
<Amount value="1.00" curr="NAD" />
</Payee>
</Payees>
</ReqPay>

Credit Response from Beneficary SoV Provider to IPS : RespPay- Credit

<RespPay>
    <Head ver="2.0" ts="2025-06-11T06:40:58+02:00" orgId="700001"
        msgId="XYA0000000001vRPtRSgrisL5LB1OBrC" prodTYpe=”UPI” />
    <Txn id="MYSIM00000001vRPtRTgqKswWgm6RcQw" note="test" refId="Ref"
        refUrl="https://www.sbi.co.in/" ts="2018-03-02T16:27:44+05:30" type="CREDIT"
        custRef="516206118970" initiationMode="00" subType="PAY" purpose="12">
        <RiskScores>
            <Score provider="psp1" type="TXNRISK" value="00032" />

        Technical Specification Document                               332 | P a g e

<Score provider="psp3" type="TXNRISK" value="00040" />
<Score provider="NPCI" type="TXNRISK" value="00999" />
</RiskScores>
</Txn>
<Resp reqMsgId="1xysVm1JmqjU" result="SUCCESS">
<Ref type="PAYEE" seqNum="1" addr="agath@mypsp" settAmount="1.00" settCurrency="NAD"
            approvalNum="654321" respCode="00" regName="ree" acNum="2678892001829"
            IFSC="AABY0000382" code="0000" accType="SAVINGS" />
</Resp>
</RespPay>

Final Response from IPS to Payer IPS Participant: RespPay – PAY

<RespPay>
    <Head ver="2.0" ts="2025-06-11T06:40:58+02:00" orgId="NPCI" msgId="1xysVm1JmqjW" prodType=”UPI”/>
    <Txn id="MYSIM00000001vRPtRTgqKswWgm6RcQw" note="test" refId="Ref"
        refUrl="https://www.sbi.co.in/" ts="2018-03-02T16:27:44+05:30" type="PAY"
        custRef="516206118970" initiationMode="00" purpose="12">
        <RiskScores>
            <Score provider="psp1" type="TXNRISK" value="00032" />
            <Score provider="psp3" type="TXNRISK" value="00040" />
            <Score provider="NPCI" type="TXNRISK" value="00999" />
        </RiskScores>
    </Txn>
    <Resp reqMsgId="XYD0000000000001GRDpegB9EWpFIHL7Tzs" result="SUCCESS">
        <Ref type="PAYER" seqNum="1" addr="payer@mypsp" settAmount="1.00" settCurrency="NAD"
            approvalNum="654321" respCode="00" regName="Shyam" orgAmount="1.00" acNum="3453454385"
            IFSC="AABY0000382" code="0000" accType="SAVINGS" />
        <Ref type="PAYEE" seqNum="1" addr="agath@mypsp" settAmount="1.00" settCurrency="NAD"
            approvalNum="654321" respCode="00" regName="ree" orgAmount="1.00" acNum="2678892001829"
            IFSC="AABY0000382" code="0000" accType="SAVINGS" cmId="" />
    </Resp>
</RespPay>

        Technical Specification Document                               333 | P a g e

Transaction Confirmation Request from IPS to Payee IPS Participant:

<ReqTxnConfirmation>
    <Head ver="2.0" ts="2025-06-11T06:40:58+02:00" orgId="NPCI" msgId="1xysVm1JmqjZ" prodType=”UPI”/>
    <Txn id="MYSIM00000001vRPtRTgqKswWgm6RcQw" note="test" refId="Ref"
        refUrl="https://www.sbi.co.in/" ts="2018-03-02T16:27:44+05:30" type="TxnConfirmation"
        orgTxnId="MYSIM00000001vRPtRTgqKswWgm6RcQw" custRef="516206118970" initiationMode="00"
        purpose="12" />
    <TxnConfirmation note="test" orgStatus="SUCCESS" type="PAY">
        <Ref type="PAYEE" seqNum="1" addr="agath@mypsp" settAmount="1.00" settCurrency="NAD"
            approvalNum="654321" respCode="00" regName="ree" orgAmount="1.00" acNum="2678892001829"
            IFSC="AABY0000382" code="0000" accType="SAVINGS" cmId="" />
    </TxnConfirmation>
</ReqTxnConfirmation>

Transaction Confirmation Response from Payee IPS Participant to IPS:

<ReqTxnConfirmation>

<Head ver="2.0" ts="2025-06-11T06:40:58+02:00" orgId="NPCI" msgId="1xysVm1JmqjZ" prodType=”UPI”
/>

    <Txn id="MYSIM00000001vRPtRTgqKswWgm6RcQw" note="test" refId="Ref"
        refUrl="https://www.sbi.co.in/" ts="2018-03-02T16:27:44+05:30" type="TxnConfirmation"
        orgTxnId="MYSIM00000001vRPtRTgqKswWgm6RcQw" custRef="516206118970" initiationMode="00"
        purpose="12" />
    <TxnConfirmation note="test" orgStatus="SUCCESS" type="PAY">
        <Ref type="PAYEE" seqNum="1" addr="agath@mypsp" settAmount="1.00" settCurrency="NAD"
            approvalNum="654321" respCode="00" regName="ree" orgAmount="1.00" acNum="2678892001829"
            IFSC="AABY0000382" code="0000" accType="SAVINGS" cmId="" />
    </TxnConfirmation>

</ReqTxnConfirmation>

        Technical Specification Document                               334 | P a g e

6.20. Merchant Cash out – Pay by Alias

Refer Specifications Pay API

Request from Payer IPS Participant to IPS: ReqPay - Pay

<ReqPay>
    <Head ver="2.0" ts="2025-06-11T06:54:10+02:00" orgId="700001"
        msgId="XYD0000000000001GRDpegB9EWpFIHL7Tzs" prodType="UPI" prodType=”UPI” />
    <Meta>
        <Tag name="PAYREQSTART" value="2017-12-04T14:15:35+05:30" />
        <Tag name="PAYREQEND" value="2017-12-04T14:15:35+05:30" />
    </Meta>
    <Txn id="MYSIM00000001vRPtRTgqKswWhKKYR5S" note="test" refId="Ref"
        refUrl="https://www.sbi.co.in/" ts="2018-03-02T16:27:44+05:30" type="PAY"
        custRef="516206652643" initiationMode="00" purpose="11">
        <RiskScores>
            <Score provider="psp1" type="TXNRISK" value="00032" />
            <Score provider="psp3" type="TXNRISK" value="00040" />
        </RiskScores>
    </Txn>
    <Payer addr="payer@mypsp" name="Shyam" seqNum="1" type="PERSON" code="0000">
        <Info>
            <Identity type="PAN" verifiedName="Ram" id="SDF45645BJB22" />
            <Rating verifiedAddress="TRUE"></Rating>
        </Info>
        <Device>
            <Tag name="MOBILE" value="993456789" />
            <Tag name="TYPE" value="MOB" />
            <Tag name="ID" value="000000000000002" />
            <Tag name="OS" value="android" />
            <Tag name="APP" value="org.npci.upi.maggi" />
        </Device>
        <Ac addrType="ACCOUNT">
            <Detail name="IFSC" value="AABY0000382" />

        Technical Specification Document                               335 | P a g e

<Detail name="ACTYPE" value="SAVINGS" />
<Detail name="ACNUM" value="3453454385" />
</Ac>
<Creds>
<Cred type="PIN" subType="MPIN">
<Data code="NPCI"
ki="20150822">2.0|f/QmvYkC0vxnsFd1jX94C6d25OOph3/H3Q6KIL11Wo++NZ7L7vICZMqvHMYrAkb4BJWarwis1NTq&#x
d;cxS22MxdclHtFFmRCI+Bp+uFGDagbZnx7mgpztXLNypxyJhZIKB8JqkntYDeUGgXZsT7W7IcgmVn&#xd;
ayDmpCCEAnc/urtALA6x03flONXeEYllHQWMIEOJjgcOpsW9aDVCxcsYW75v5dDLc2ZR1CyEpIPN&#xd;
ECOvayEAGrMTNzArSvgQ261sEPrBFhAnxSNBNeIQdoVn/n2TjLzzAvNXxaXXg07gS/s5l/K9nzU+&#xd;
9GC/pww7NxZrcKHI32kFf0LCw9EP+uvfgQzCzA==&#xd;
</Data>
</Cred>
</Creds>
<Amount value="1.00" curr="NAD" />
</Payer>
<Payees>
<Payee addr="agath@mypsp" name="SonySuper" seqNum="1" type="ENTITY" code="5310" cmId="">
<Amount value="1.00" curr="NAD" />
<Merchant>
<Identifier subCode="1234" mid="123" sid="89311234567890122306" tid="8765987654"
                    merchantType="SMALL" merchantGenre="ONLINE" onBoardingType="AGGREGATOR"
                    regId="AB12De" pinCode="507123" tier="TIER3" />
<Name brand="AllianceFranche" legal="Reliance" franchise="LearnFrench" />
<Ownership type="PUBLIC" />
<Invoice name="ramya" num="1" date="2020-05-30T07:06:06+05:30" />
</Merchant>
</Payee>
</Payees>
</ReqPay>

        Technical Specification Document                               336 | P a g e

Request from IPS to Merchant IPS Partcipant: ReqAuthDetails

<ReqAuthDetails>
    <Head ver="2.0" ts="2025-06-11T06:54:10+02:00" orgId="NPCI" msgId="1xysVm1OIJT5" prodType=”UPI”/>
    <Txn id="MYSIM00000001vRPtRTgqKswWhKKYR5S" note="test" refId="Ref"
        refUrl="https://www.sbi.co.in/" ts="2018-03-02T16:27:44+05:30" type="PAY"
        custRef="516206652643" initiationMode="00" purpose="11">
        <RiskScores>
            <Score provider="psp1" type="TXNRISK" value="00032" />
            <Score provider="psp3" type="TXNRISK" value="00040" />
        </RiskScores>
    </Txn>
    <Payees>
        <Payee addr="agath@mypsp" name="SonySuper" seqNum="1" type="ENTITY" code="5310" cmId="">
            <Amount value="1.00" curr="NAD" />
            <Merchant>
                <Identifier subCode="1234" mid="123" sid="89311234567890122306" tid="8765987654"
                    merchantType="SMALL" merchantGenre="ONLINE" onBoardingType="AGGREGATOR"
                    regId="AB12De" pinCode="507123" tier="TIER3" />
                <Name brand="AllianceFranche" legal="Reliance" franchise="LearnFrench" />
                <Ownership type="PUBLIC" />
                <Invoice name="ramya" num="1" date="2020-05-30T07:06:06+05:30" />
            </Merchant>
        </Payee>
    </Payees>
    <Payer addr="payer@mypsp" name="Shyam" seqNum="1" type="PERSON" code="0000">
        <Info>
            <Identity type="PAN" verifiedName="Ram" id="SDF45645BJB22" />
            <Rating verifiedAddress="TRUE"></Rating>
        </Info>
        <Ac addrType="ACCOUNT">
            <Detail name="IFSC" value="AABY0000382" />
            <Detail name="ACTYPE" value="SAVINGS" />

        Technical Specification Document                               337 | P a g e

<Detail name="ACNUM" value="3453454385" />
</Ac>
<Amount value="1.00" curr="NAD" />
</Payer>
</ReqAuthDetails>

Response from Merchant IPS Partcipant to IPS: RespAuthDetails

<RespAuthDetails>
    <Head ver="2.0" ts="2025-06-11T06:54:10.353+02:00" orgId="700001"
        msgId="XYA0000000000001vRPtRSgrisL5MZs3fNz" prodType=”UPI”/>
    <Resp reqMsgId="1xysVm1OIJT5" result="SUCCESS" />
    <Txn id="MYSIM00000001vRPtRTgqKswWhKKYR5S" note="test" refId="Ref"
        refUrl="https://www.sbi.co.in/" ts="2018-03-02T16:27:44+05:30" type="PAY"
        custRef="516206652643" initiationMode="00" purpose="11">
        <RiskScores>
            <Score provider="SBI" type="TXNRISK" value="10" />
        </RiskScores>
    </Txn>
    <Payer addr="payer@mypsp" name="Shyam" seqNum="1" type="PERSON" code="0000">
        <Info>
            <Identity type="PAN" verifiedName="Ram" id="SDF45645BJB22" />
            <Rating verifiedAddress="TRUE"></Rating>
        </Info>
        <Ac addrType="ACCOUNT">
            <Detail name="IFSC" value="AABY0000382" />
            <Detail name="ACTYPE" value="SAVINGS" />
            <Detail name="ACNUM" value="3453454385" />
        </Ac>
        <Amount value="1.00" curr="NAD" />
    </Payer>
    <Payees>
        <Payee addr="agath@mypsp" name="SonySuper" seqNum="1" type="ENTITY" code="5310" cmId="">
            <Info>

        Technical Specification Document                               338 | P a g e

<Identity type="ACCOUNT" verifiedName="narayanan" id="AAB45645BJB15" />
<Rating verifiedAddress="TRUE"></Rating>
</Info>
<Device>
<Tag name="MOBILE" value="993456780" />
<Tag name="APP" value="org.npci.upi.maggi" />
<Tag name="TYPE" value="MOB" />
<Tag name="ID" value="0000000000000020" />
</Device>
<Ac addrType="ACCOUNT">
<Detail name="IFSC" value="AABY0000382" />
<Detail name="ACNUM" value="2678892001829" />
<Detail name="ACTYPE" value="SAVINGS" />
</Ac>
<Amount value="1.00" curr="NAD" />
<Merchant>
<Identifier subCode="1234" mid="123" sid="89311234567890122306" tid="8765987654"
                    merchantType="SMALL" merchantGenre="ONLINE" onBoardingType="AGGREGATOR"
                    regId="AB12De" pinCode="507123" tier="TIER3" />
<Name brand="AllianceFranche" legal="Reliance" franchise="LearnFrench" />
<Ownership type="PUBLIC" />
<Invoice name="ramya" num="1" date="2020-05-30T07:06:06+05:30" />
</Merchant>
</Payee>
</Payees>
</RespAuthDetails>

        Technical Specification Document                               339 | P a g e

Request from IPS to Remitter SoV Provider: ReqPay -Debit

<ReqPay>
    <Head ver="2.0" ts="2025-06-11T06:54:12+02:00" orgId="NPCI" msgId="1xysVm1OJzUX" prodType=”UPI”/>
    <Meta>
        <Tag name="PAYREQSTART" value="2017-12-04T14:15:35+05:30" />
        <Tag name="PAYREQEND" value="2017-12-04T14:15:35+05:30" />
    </Meta>
    <Txn id="MYSIM00000001vRPtRTgqKswWhKKYR5S" note="test" refId="Ref"
        refUrl="https://www.sbi.co.in/" ts="2018-03-02T16:27:44+05:30" type="DEBIT"
        custRef="516206652643" initiationMode="00" subType="PAY" purpose="11">
        <RiskScores>
            <Score provider="psp1" type="TXNRISK" value="00032" />
            <Score provider="psp3" type="TXNRISK" value="00040" />
            <Score provider="NPCI" type="TXNRISK" value="00999" />
        </RiskScores>
    </Txn>
    <Payer addr="payer@mypsp" name="Shyam" seqNum="1" type="PERSON" code="0000">
        <Info>
            <Identity type="PAN" verifiedName="Ram" id="SDF45645BJB22" />
            <Rating verifiedAddress="TRUE"></Rating>
        </Info>
        <Device>
            <Tag name="MOBILE" value="993456789" />
            <Tag name="TYPE" value="MOB" />
            <Tag name="ID" value="000000000000002" />
            <Tag name="OS" value="android" />
            <Tag name="APP" value="org.npci.upi.maggi" />
        </Device>
        <Ac addrType="ACCOUNT">
            <Detail name="IFSC" value="AABY0000382" />
            <Detail name="ACTYPE" value="SAVINGS" />
            <Detail name="ACNUM" value="3453454385" />
        </Ac>

        Technical Specification Document                               340 | P a g e

<Creds>
<Cred type="PIN" subType="MPIN">
<Data code="700001" ki="20160217">

qMmG1Dcpd+LzL+Dw9ZoP1u8ijngWf0+LwQ4Wq4SYx4ztId9FtaTVQl28vUCZ3V1edMNrs8+gsmYV8ed9/+hAKs8yYRDxvsMr0Pr9H
qyZj8azJXYnwVVnV3FhOFe7bqxFbaMjl1o+s4kOB/cOaPOwb9ZPiAnqJdHUOjDt8Uh9gR/8J7Gq5dDdnkbkVU7I0p/wsumX7y9xW9
SU4JSSgpmhDaHlkcGj9sIRELK1CiDcqjgttaubXgwf4xywSMgmLLdHPER0JVFN4+MGZpm0SLn2Fj2adhtfT6qfNQh+7r2xlAlXMEw
kCYbEyFlSeIsE1y9luNUiKxjQYDPk81NUHsH2oQ==</Data>
</Cred>
</Creds>
<Amount value="1.00" curr="NAD" />
</Payer>
<Payees>
<Payee addr="agath@mypsp" name="SonySuper" seqNum="1" type="ENTITY" code="5310" cmId="">
<Info>
<Identity type="ACCOUNT" verifiedName="narayanan" id="AAB45645BJB15" />
<Rating verifiedAddress="TRUE"></Rating>
</Info>
<Device>
<Tag name="MOBILE" value="993456780" />
<Tag name="APP" value="org.npci.upi.maggi" />
<Tag name="TYPE" value="MOB" />
<Tag name="ID" value="0000000000000020" />
</Device>
<Ac addrType="ACCOUNT">
<Detail name="IFSC" value="AABY0000382" />
<Detail name="ACNUM" value="2678892001829" />
<Detail name="ACTYPE" value="SAVINGS" />
</Ac>
<Amount value="1.00" curr="NAD" />
<Merchant>
<Identifier subCode="1234" mid="123" sid="89311234567890122306" tid="8765987654"
                    merchantType="SMALL" merchantGenre="ONLINE" onBoardingType="AGGREGATOR"
                    regId="AB12De" pinCode="507123" tier="TIER3" />
<Name brand="AllianceFranche" legal="Reliance" franchise="LearnFrench" />

        Technical Specification Document                               341 | P a g e

<Ownership type="PUBLIC" />
<Invoice name="ramya" num="1" date="2020-05-30T07:06:06+05:30" />
</Merchant>
</Payee>
</Payees>
</ReqPay>

Response from Remitter Bank to IPS : RespPay Debit

<RespPay>
    <Head ver="2.0" ts="2025-06-11T06:54:12+02:00" orgId="700001"
        msgId="XYA0000000001vRPtRSgrisL5MZFLljv" prodType=”UPI”/>
    <Txn id="MYSIM00000001vRPtRTgqKswWhKKYR5S" note="test" refId="Ref"
        refUrl="https://www.sbi.co.in/" ts="2018-03-02T16:27:44+05:30" type="DEBIT"
        custRef="516206652643" initiationMode="00" subType="PAY" purpose="11">
        <RiskScores>
            <Score provider="psp1" type="TXNRISK" value="00032" />
            <Score provider="psp3" type="TXNRISK" value="00040" />
            <Score provider="NPCI" type="TXNRISK" value="00999" />
        </RiskScores>
    </Txn>
    <Resp reqMsgId="1xysVm1OJzUX" result="SUCCESS">
        <Ref type="PAYER" seqNum="1" addr="payer@mypsp" settAmount="1.00" settCurrency="NAD"
            approvalNum="654321" respCode="00" regName="Shyam" acNum="3453454385" IFSC="AABY0000382"
            code="0000" accType="SAVINGS" />
    </Resp>
</RespPay>

        Technical Specification Document                               342 | P a g e

Request from IPS to Beneficiary Sov Provider: ReqPay-Credit

<ReqPay>
    <Head ver="2.0" ts="2025-06-11T06:54:12+02:00" orgId="NPCI" msgId="1xysVm1OJzUZ" prodType=”UPI”/>
    <Meta>
        <Tag name="PAYREQSTART" value="2017-12-04T14:15:35+05:30" />
        <Tag name="PAYREQEND" value="2017-12-04T14:15:35+05:30" />
    </Meta>
    <Txn id="MYSIM00000001vRPtRTgqKswWhKKYR5S" note="test" refId="Ref"
        refUrl="https://www.sbi.co.in/" ts="2018-03-02T16:27:44+05:30" type="CREDIT"
        custRef="516206652643" initiationMode="00" subType="PAY" purpose="11">
        <RiskScores>
            <Score provider="psp1" type="TXNRISK" value="00032" />
            <Score provider="psp3" type="TXNRISK" value="00040" />
            <Score provider="NPCI" type="TXNRISK" value="00999" />
        </RiskScores>
    </Txn>
    <Payer addr="payer@mypsp" name="Shyam" seqNum="1" type="PERSON" code="0000">
        <Info>
            <Identity type="PAN" verifiedName="Ram" id="SDF45645BJB22" />
            <Rating verifiedAddress="TRUE"></Rating>
        </Info>
        <Device>
            <Tag name="MOBILE" value="993456789" />
            <Tag name="TYPE" value="MOB" />
            <Tag name="ID" value="000000000000002" />
            <Tag name="OS" value="android" />
            <Tag name="APP" value="org.npci.upi.maggi" />
        </Device>
        <Ac addrType="ACCOUNT">
            <Detail name="IFSC" value="AABY0000382" />
            <Detail name="ACTYPE" value="SAVINGS" />
            <Detail name="ACNUM" value="3453454385" />
        </Ac>
        <Amount value="1.00" curr="NAD" />

        Technical Specification Document                               343 | P a g e

</Payer>
<Payees>
<Payee addr="agath@mypsp" name="SonySuper" seqNum="1" type="ENTITY" code="5310" cmId="">
<Info>
<Identity type="ACCOUNT" verifiedName="narayanan" id="AAB45645BJB15" />
<Rating verifiedAddress="TRUE"></Rating>
</Info>
<Device>
<Tag name="MOBILE" value="993456780" />
<Tag name="APP" value="org.npci.upi.maggi" />
<Tag name="TYPE" value="MOB" />
<Tag name="ID" value="0000000000000020" />
</Device>
<Ac addrType="ACCOUNT">
<Detail name="IFSC" value="AABY0000382" />
<Detail name="ACNUM" value="2678892001829" />
<Detail name="ACTYPE" value="SAVINGS" />
</Ac>
<Amount value="1.00" curr="NAD" />
<Merchant>
<Identifier subCode="1234" mid="123" sid="89311234567890122306" tid="8765987654"
                    merchantType="SMALL" merchantGenre="ONLINE" onBoardingType="AGGREGATOR"
                    regId="AB12De" pinCode="507123" tier="TIER3" />
<Name brand="AllianceFranche" legal="Reliance" franchise="LearnFrench" />
<Ownership type="PUBLIC" />
<Invoice name="ramya" num="1" date="2020-05-30T07:06:06+05:30" />
</Merchant>
</Payee>
</Payees>
</ReqPay>

        Technical Specification Document                               344 | P a g e

Response from Beneficiary Sov Provider to IPS: ReqPay-Credit

<RespPay>
    <Head ver="2.0" ts="2025-06-11T06:54:12+02:00" orgId="700001"
        msgId="XYA0000000001vRPtRSgrisL5MZFPxsz" prodTYpe=”UPI”/>
    <Txn id="MYSIM00000001vRPtRTgqKswWhKKYR5S" note="test" refId="Ref"
        refUrl="https://www.sbi.co.in/" ts="2018-03-02T16:27:44+05:30" type="CREDIT"
        custRef="516206652643" initiationMode="00" subType="PAY" purpose="11">
        <RiskScores>
            <Score provider="psp1" type="TXNRISK" value="00032" />
            <Score provider="psp3" type="TXNRISK" value="00040" />
            <Score provider="NPCI" type="TXNRISK" value="00999" />
        </RiskScores>
    </Txn>
    <Resp reqMsgId="1xysVm1OJzUZ" result="SUCCESS">
        <Ref type="PAYEE" seqNum="1" addr="agath@mypsp" settAmount="1.00" settCurrency="NAD"
            approvalNum="654321" respCode="00" regName="SonySuper" acNum="2678892001829"
            IFSC="AABY0000382" code="0000" accType="SAVINGS" />
    </Resp>
</RespPay>

Response from ISP to Payer IPS Participant: RespPay-PAY

<RespPay>

<Head ver="2.0" ts="2025-06-11T06:54:12+02:00" orgId="NPCI" msgId="1xysVm1OJzV1" prodType=”UPI”
/>

    <Txn id="MYSIM00000001vRPtRTgqKswWhKKYR5S" note="test" refId="Ref"
        refUrl="https://www.sbi.co.in/" ts="2018-03-02T16:27:44+05:30" type="PAY"
        custRef="516206652643" initiationMode="00" purpose="11">
        <RiskScores>
            <Score provider="psp1" type="TXNRISK" value="00032" />
            <Score provider="psp3" type="TXNRISK" value="00040" />
            <Score provider="NPCI" type="TXNRISK" value="00999" />
        </RiskScores>

        Technical Specification Document                               345 | P a g e

</Txn>
<Resp reqMsgId="XYD0000000000001GRDpegB9EWpFIHL7Tzs" result="SUCCESS">
<Ref type="PAYER" seqNum="1" addr="payer@mypsp" settAmount="1.00" settCurrency="NAD"
            approvalNum="654321" respCode="00" regName="Shyam" orgAmount="1.00" acNum="3453454385"
            IFSC="AABY0000382" code="0000" accType="SAVINGS" />
<Ref type="PAYEE" seqNum="1" addr="agath@mypsp" settAmount="1.00" settCurrency="NAD"
            approvalNum="654321" respCode="00" regName="SonySuper" orgAmount="1.00"
            acNum="2678892001829" IFSC="AABY0000382" code="5310" accType="SAVINGS" cmId="" />
</Resp>
</RespPay>

Transaction Confirmation Request from IPS to Merchant ISP Participant:

<ReqTxnConfirmation>
    <Head ver="2.0" ts="2025-06-11T06:54:12+02:00" orgId="NPCI" msgId="1xysVm1OJzV4" />
    <Txn id="MYSIM00000001vRPtRTgqKswWhKKYR5S" note="test" refId="Ref"
        refUrl="https://www.sbi.co.in/" ts="2018-03-02T16:27:44+05:30" type="TxnConfirmation"
        orgTxnId="MYSIM00000001vRPtRTgqKswWhKKYR5S" custRef="516206652643" initiationMode="00"
        purpose="11" />
    <TxnConfirmation note="test" orgStatus="SUCCESS" type="PAY">
        <Ref type="PAYEE" seqNum="1" addr="agath@mypsp" settAmount="1.00" settCurrency="NAD"
            approvalNum="654321" respCode="00" regName="SonySuper" orgAmount="1.00"
            acNum="2678892001829" IFSC="AABY0000382" code="5310" accType="SAVINGS" cmId="" />
    </TxnConfirmation>
</ReqTxnConfirmation>

        Technical Specification Document                               346 | P a g e

Transaction Confirmation Response from Merchant ISP Participant to IPS:

<RespTxnConfirmation>

<Head ver="2.0" ts="2025-06-11T06:54:12+02:00" orgId="700001" msgId="3BIhGBUToQJ2KjaZM"
prodType=”UPI” />

    <Txn id="MYSIM00000001vRPtRTgqKswWhKKYR5S" note="test" refId="Ref"
        refUrl="https://www.sbi.co.in/" ts="2018-03-02T16:27:44+05:30" type="TxnConfirmation"
        orgTxnId="MYSIM00000001vRPtRTgqKswWhKKYR5S" custRef="516206652643" initiationMode="00"
        purpose="11" />
    <Resp reqMsgId="3BIhGBUToQJ2KjaZM" result="SUCCESS" />

</RespTxnConfirmation>

        Technical Specification Document                               347 | P a g e

6.21. ATM Cash Out

Refer Specifications for Payment Pay API

Request from ATM Acquirer to IPS :

<ReqPay>
    <Head ver="2.0" ts="2025-09-30T16:03:38+05:30" orgId="700001"
        msgId="XYD0000000000001GRDpegB9EWpFIHL7Tzs" prodType="UPI" />
    <Meta>
        <Tag name="PAYREQSTART" value="2017-12-04T14:15:35+05:30" />
        <Tag name="PAYREQEND" value="2017-12-04T14:15:35+05:30" />
    </Meta>
    <Txn id="null000000005sp20wQHPg8viLq2N5m" note="test" refId="Ref"
        refUrl="https://www.sbi.co.in/" ts="2018-03-02T16:27:44+05:30" type="PAY"
        custRef="527316114361" initiationMode="18" purpose="10">
        <RiskScores>
            <Score provider="psp1" type="TXNRISK" value="00032" />
            <Score provider="psp3" type="TXNRISK" value="00040" />
        </RiskScores>
    </Txn>
    <Payer addr="987654321@mapper.npci" name="Shyam" seqNum="1" type="PERSON" code="0000">
        <Creds>
            <Cred type="PIN" subType="MPIN">
                <Data code="NPCI"
ki="20150822">2.2.nipl|Pz0Ij/WLUaLeH4kVOFdFAMYdrcfvCbZNm0pc2YVmNcYD09stZ5QPZRWeiKjwJi25Yaz5HLh2OMLu&#
xd;
                    01KkPv6XTbuqf9bSs1AUNJDMGRsdgokKRjUs2QGwBovPEgNY5D/ol4o+bfgb0qwo+49EMOiDuqTa&#xd;
                    E+m0H7KHC6JgErItq1NMm6VnEoz/TTXuyLJXnnHXfBxBGpF70zU6zo9kMrihQ5y9Wa4/1IvLzuX9&#xd;
                    DGjqfPhyfbwMKVrDAQ/bXuRaLmWADiq8nje1FGkbeZaO1EK2jVH0nbKxGpyl9WTxm/kiul3Zr+v+&#xd;
                    IpdjZ7sJZnLmbgr2dtGhb8eQdzYEyUyoA0nRVw==&#xd;
                </Data>
            </Cred>
            <Cred type="OTP" subType="SMS">

        Technical Specification Document                               348 | P a g e

<Data code="NPCI"
ki="20150822">2.2.nipl|Al4fqWm1Ot699226kcAK8yPFKH5HNP/U25zASEiSKDgmSAhesubAtxS1Z3Pi0V9ehQgSHN/ssm4T&#
xd;
okBFucij+Bq3WltPKQEW3rdEoscvcjlZcoT5EbogMKAKIhnNK6Y6hJ487RMu18yIFMgwqoiCFem3&#xd;
BsEfxvm/+1Cab/hlDlI8TT7Z8fzreRRs8LOCOsrDY1c4tL7r9bGWWX82BOvE6hkbxaJ1gth2z6bI&#xd;
VrGIZtrwQzRRxLc7Hzy2LtdSeW1AFCzGpcr1SRtwyReHQtr5kMakPuCa1jscDyzkBnSSfy3hSfeX&#xd;
oB16k9Wb5UHQO+NJD9cV+rJey0WXgWr0epyxuw==&#xd;
</Data>
</Cred>
</Creds>
<Amount value="999.00" curr="NAD" />
</Payer>
<Payees>
<Payee addr="payee@mypsp" name="SonySuper" seqNum="1" type="ENTITY" code="6011" cmId="">
<Info>
<Identity type="ACCOUNT" verifiedName="narayanan" id="AAB45645BJB15" />
<Rating verifiedAddress="TRUE"></Rating>
</Info>
<Device>
<Tag name="MOBILE" value="987654321" />
<Tag name="APP" value="org.npci.upi.maggi0" />
<Tag name="TYPE" value="MOB" />
<Tag name="ID" value="0000000000000020" />
</Device>
<Ac addrType="ACCOUNT">
<Detail name="IFSC" value="AABY0288115" />
<Detail name="ACNUM" value="2678892001829" />
<Detail name="ACTYPE" value="SAVINGS" />
</Ac>
<Amount value="1.00" curr="NAD" />
<Merchant>
<Identifier subCode="6011" mid="123" sid="89311234567890122306" tid="8765987654"
                    merchantType="SMALL" merchantGenre="ONLINE" onBoardingType="AGGREGATOR"
                    regId="AB12De" pinCode="507123" tier="TIER3" />
<Name brand="AllianceFranche" legal="Reliance" franchise="LearnFrench" />

        Technical Specification Document                               349 | P a g e

<Ownership type="PUBLIC" />
<Invoice name="ramya" num="1" date="2020-05-30T07:06:06+05:30" />
</Merchant>
</Payee>
</Payees>
</ReqPay>

Note: IPS will fetch the full alias from alias directory corresponding to the mobile number provided in input. Obtained full alias will be used for
further processing.

Request from IPS to IPS Participant : ReqAuthDetails

<ReqAuthDetails>
    <Head ver="2.0" ts="2025-09-30T16:03:39+05:30" orgId="NPCI" msgId="4HItqC8XT" prodType="UPI" />
    <Txn id="null000000005sp20wQHPg8viLq2N5m" note="test" refId="Ref"
        refUrl="https://www.sbi.co.in/" ts="2018-03-02T16:27:44+05:30" type="PAY"
        custRef="527316114361" initiationMode="00" purpose="10">
        <RiskScores>
            <Score provider="psp1" type="TXNRISK" value="00032" />
            <Score provider="psp3" type="TXNRISK" value="00040" />
        </RiskScores>
    </Txn>
    <Payees>
        <Payee addr="payee@mypsp" name="SonySuper" seqNum="1" type="ENTITY" code="6011" cmId="">
            <Info>
                <Identity type="ACCOUNT" verifiedName="narayanan" id="AAB45645BJB15" />
                <Rating verifiedAddress="TRUE"></Rating>
            </Info>
            <Ac addrType="ACCOUNT">
                <Detail name="IFSC" value="AABY0288115" />
                <Detail name="ACNUM" value="2678892001829" />
                <Detail name="ACTYPE" value="SAVINGS" />
            </Ac>

        Technical Specification Document                               350 | P a g e

<Amount value="1.00" curr="NAD" />
<Merchant>
<Identifier subCode="6011" mid="123" sid="89311234567890122306" tid="8765987654"
                    merchantType="SMALL" merchantGenre="ONLINE" onBoardingType="AGGREGATOR" />
<Name brand="AllianceFranche" legal="Reliance" franchise="LearnFrench" />
<Ownership type="PUBLIC" />
</Merchant>
</Payee>
</Payees>
<Payer addr="mappervpa@mypsp" seqNum="1" type="PERSON" cmId="987654321">
<Amount value="999.00" curr="NAD" />
</Payer>
</ReqAuthDetails>

Response from IPS Participant to IPS : RespAuthDetails

<RespAuthDetails>
    <Head ver="2.0" ts="2025-09-30T16:03:39.472+05:30" orgId="700001"
        msgId="XYA0000000000005sp20wQHPg8viLwBNdV" prodType="UPI" />
    <Resp reqMsgId="4HItqC8XT" result="SUCCESS" />
    <Txn id="null000000005sp20wQHPg8viLq2N5m" note="test" refId="Ref"
        refUrl="https://www.sbi.co.in/" ts="2018-03-02T16:27:44+05:30" type="PAY"
        custRef="527316114361" initiationMode="18" purpose="10">
        <RiskScores>
            <Score provider="SBI" type="TXNRISK" value="10" />
        </RiskScores>
    </Txn>
    <Payer addr="mappervpa@mypsp" seqNum="1" type="PERSON" cmId="987654321">
        <Info>
            <Identity type="ACCOUNT" verifiedName="narayanan" id="AAB45645BJB15" />
            <Rating verifiedAddress="TRUE"></Rating>
        </Info>

        Technical Specification Document                               351 | P a g e

<Device>
<Tag name="MOBILE" value="993456789" />
<Tag name="APP" value="org.npci.upi.maggi" />
<Tag name="TYPE" value="MOB" />
<Tag name="ID" value="0000000000000020" />
</Device>
<Ac addrType="ACCOUNT">
<Detail name="IFSC" value="AABY0000382" />
<Detail name="ACNUM" value="2678892001822" />
<Detail name="ACTYPE" value=" WALLET" />
</Ac>
<Amount value="999.00" curr="NAD" />
</Payer>
<Payees>
<Payee addr="payee@mypsp" name="SonySuper" seqNum="1" type="ENTITY" code="6011" cmId="">
<Info>
<Identity type="ACCOUNT" verifiedName="narayanan" id="AAB45645BJB15" />
<Rating verifiedAddress="TRUE"></Rating>
</Info>
<Device>
<Tag name="MOBILE" value="993456780" />
<Tag name="APP" value="org.npci.upi.maggi" />
<Tag name="TYPE" value="MOB" />
<Tag name="ID" value="0000000000000020" />
</Device>
<Ac addrType="ACCOUNT">
<Detail name="IFSC" value="AABY0000382" />
<Detail name="ACNUM" value="2678892001829" />
<Detail name="ACTYPE" value="SAVINGS" />
</Ac>
<Amount value="1.00" curr="NAD" />
<Merchant>
<Identifier subCode="6011" mid="123" sid="89311234567890122306" tid="8765987654"
                    merchantType="SMALL" merchantGenre="ONLINE" onBoardingType="AGGREGATOR" />
<Name brand="AllianceFranche" legal="Reliance" franchise="LearnFrench" />

        Technical Specification Document                               352 | P a g e

<Ownership type="PUBLIC" />
</Merchant>
</Payee>
</Payees>
</RespAuthDetails>

Request from IPS to IPS Partcipant: ReqPay-Debit

<ReqPay>
    <Head ver="2.0" ts="2025-09-30T16:03:39+05:30" orgId="NPCI" msgId="4HItqC8XV" prodType="UPI"  />
    <Meta>
        <Tag name="PAYREQSTART" value="2017-12-04T14:15:35+05:30" />
        <Tag name="PAYREQEND" value="2017-12-04T14:15:35+05:30" />
    </Meta>
    <Txn id="null000000005sp20wQHPg8viLq2N5m" note="test" refId="Ref"
        refUrl="https://www.sbi.co.in/" ts="2018-03-02T16:27:44+05:30" type="DEBIT"
        custRef="527316114361" initiationMode="18" subType="PAY" purpose="10">
        <RiskScores>
            <Score provider="psp1" type="TXNRISK" value="00032" />
            <Score provider="psp3" type="TXNRISK" value="00040" />
        </RiskScores>
    </Txn>
    <Payer addr="mappervpa@mypsp" name="Shyam" seqNum="1" type="PERSON" code="0000" cmId="987654321">
        <Info>
            <Identity type="ACCOUNT" verifiedName="narayanan" id="AAB45645BJB15" />
            <Rating verifiedAddress="TRUE"></Rating>
        </Info>
        <Device>
            <Tag name="MOBILE" value="993456789" />
            <Tag name="APP" value="org.npci.upi.maggi" />
            <Tag name="TYPE" value="MOB" />
            <Tag name="ID" value="0000000000000020" />

        Technical Specification Document                               353 | P a g e

</Device>
<Ac addrType="ACCOUNT">
<Detail name="IFSC" value="AABY0000382" />
<Detail name="ACNUM" value="2678892001822" />
<Detail name="ACTYPE" value="WALLET" />
</Ac>
<Creds>
<Cred type="PIN" subType="MPIN">
<Data code="700001" ki="20160218">

KNKImvZ76ZzoBOaiT5td6m4R/ioMtPbp3ra0B5c553oK7FSO9pH93f+q8P5SMG8kAZPCxtgsOwkIwRpLXhcQnlSnG9TCk2cvz3FOE
2S4kDC7kiLnGX2t791mVK/ugZGRC5Ec6WlfgPHQSEJCBvn/CvZYsVb7n0xqtvrpdMogyyMHhxtOofZKgluKFTNa5bbCdUi8H36onS
RVIcsIbcZxFtpnKkVnJC0gwtU6AKC0agOwVMiPsGVQxm5xmBcjtg87jUEanrNuOBxbWUM4pr10XHKrHW82kBKY1JVIgvf9ODQxnpm
cRoe1k2Oh3DEcmJ1YBtV3ru1v+b3bPQOItISMVg==</Data>
</Cred>
<Cred type="OTP" subType="SMS">
<Data code="700001" ki="20160218">

tL6pY2wZLTE3tfCGxmxn6uJXsFzdeuf/tm+iQoUYKTEhZ3HAlqOVt5twOyPJ5sgx0drYOrL6B4F2rORwIQNSur1jSdHQXuILTPat7
zAaVrVfBSigcQNGRvQnjcWQI5Qc9fIhrF4fhU1kYr1N8EJbqiAlLmuEibOW5cj72h1wmGbRzRx8c/XTRVbz2wp9N70KRwM+NoYf6x
QlzujPM6kQn+HMBzQWDOUWhLSsP+vz3eqCuxJfiyiBMpKu9Tu7DivPhgRcbvIIK/HoZlTPiemIpAe0fh+ZG8LDsH6kkYviYp4ZOis
A6AJKQnQjNlfgIlVBVh4QXFaTcB3wZ8lPuuOG1A==</Data>
</Cred>
</Creds>
<Amount value="999.00" curr="NAD" />
</Payer>
<Payees>
<Payee addr="payee@mypsp" name="SonySuper" seqNum="1" type="ENTITY" code="6011" cmId="">
<Info>
<Identity type="ACCOUNT" verifiedName="narayanan" id="AAB45645BJB15" />
<Rating verifiedAddress="TRUE"></Rating>
</Info>
<Device>
<Tag name="MOBILE" value="987654321" />
<Tag name="APP" value="org.npci.upi.maggi0" />

        Technical Specification Document                               354 | P a g e

<Tag name="TYPE" value="MOB" />
<Tag name="ID" value="0000000000000020" />
</Device>
<Ac addrType="ACCOUNT">
<Detail name="IFSC" value="AABY0288115" />
<Detail name="ACNUM" value="2678892001829" />
<Detail name="ACTYPE" value="SAVINGS" />
</Ac>
<Amount value="1.00" curr="NAD" />
<Merchant>
<Identifier subCode="6011" mid="123" sid="89311234567890122306" tid="8765987654"
                    merchantType="SMALL" merchantGenre="ONLINE" onBoardingType="AGGREGATOR"
                    regId="AB12De" pinCode="507123" tier="TIER3" />
<Name brand="AllianceFranche" legal="Reliance" franchise="LearnFrench" />
<Ownership type="PUBLIC" />
<Invoice name="ramya" num="1" date="2020-05-30T07:06:06+05:30" />
</Merchant>
</Payee>
</Payees>
</ReqPay>

Response from IPS Participant to IPS : RespPay-Debit

    <Head ver="2.0" ts="2025-09-30T16:03:39+05:30" orgId="700001"
        msgId="XYA0000000005sp20wQHPg8viLxHlzk" prodType="UPI" />
    <Txn id="null000000005sp20wQHPg8viLq2N5m" note="test" refId="Ref"
        refUrl="https://www.sbi.co.in/" ts="2018-03-02T16:27:44+05:30" type="DEBIT"
        custRef="527316114361" initiationMode="18" subType="PAY" purpose="10">
        <RiskScores>
            <Score provider="psp1" type="TXNRISK" value="00032" />
            <Score provider="psp3" type="TXNRISK" value="00040" />
        </RiskScores>
    </Txn>

        Technical Specification Document                               355 | P a g e

<Resp reqMsgId="4HItqC8XV" result="SUCCESS">
<Ref type="PAYER" seqNum="1" addr="mappervpa@mypsp" settAmount="999.00" settCurrency="NAD"
            approvalNum="654321" respCode="00" regName="Shyam" acNum="2678892001822"
            IFSC="AABY0000382" code="0000" accType="WALLET" balAmt="20.00" />
</Resp>
</RespPay>

Request from IPS to IPS Participant : ReqPay-Credit

<ReqPay>
    <Head ver="2.0" ts="2025-09-30T16:03:39+05:30" orgId="NPCI" msgId="4HItqC8XX" prodType=”UPI” />
    <Meta>
        <Tag name="PAYREQSTART" value="2017-12-04T14:15:35+05:30" />
        <Tag name="PAYREQEND" value="2017-12-04T14:15:35+05:30" />
    </Meta>
    <Txn id="null000000005sp20wQHPg8viLq2N5m" note="test" refId="Ref"
        refUrl="https://www.sbi.co.in/" ts="2018-03-02T16:27:44+05:30" type="CREDIT"
        custRef="527316114361" initiationMode="18" subType="PAY" purpose="10">
        <RiskScores>
            <Score provider="psp1" type="TXNRISK" value="00032" />
            <Score provider="psp3" type="TXNRISK" value="00040" />
        </RiskScores>
    </Txn>
    <Payer addr="mappervpa@mypsp" name="Shyam" seqNum="1" type="PERSON" code="0000" cmId="987654321">
        <Info>
            <Identity type="ACCOUNT" verifiedName="narayanan" id="AAB45645BJB15" />
            <Rating verifiedAddress="TRUE"></Rating>
        </Info>
        <Device>
            <Tag name="MOBILE" value="993456789" />
            <Tag name="APP" value="org.npci.upi.maggi" />
            <Tag name="TYPE" value="MOB" />
            <Tag name="ID" value="0000000000000020" />
        </Device>

        Technical Specification Document                               356 | P a g e

<Ac addrType="ACCOUNT">
<Detail name="IFSC" value="AABY0000382" />
<Detail name="ACNUM" value="2678892001822" />
<Detail name="ACTYPE" value="WALLET" />
</Ac>
<Amount value="999.00" curr="NAD" />
</Payer>
<Payees>
<Payee addr="payee@mypsp" name="SonySuper" seqNum="1" type="ENTITY" code="6011" cmId="">
<Info>
<Identity type="ACCOUNT" verifiedName="narayanan" id="AAB45645BJB15" />
<Rating verifiedAddress="TRUE"></Rating>
</Info>
<Device>
<Tag name="MOBILE" value="987654321" />
<Tag name="APP" value="org.npci.upi.maggi0" />
<Tag name="TYPE" value="MOB" />
<Tag name="ID" value="0000000000000020" />
</Device>
<Ac addrType="ACCOUNT">
<Detail name="IFSC" value="AABY0288115" />
<Detail name="ACNUM" value="2678892001829" />
<Detail name="ACTYPE" value="SAVINGS" />
</Ac>
<Amount value="1.00" curr="NAD" />
<Merchant>
<Identifier subCode="6011" mid="123" sid="89311234567890122306" tid="8765987654"
                    merchantType="SMALL" merchantGenre="ONLINE" onBoardingType="AGGREGATOR"
                    regId="AB12De" pinCode="507123" tier="TIER3" />
<Name brand="AllianceFranche" legal="Reliance" franchise="LearnFrench" />
<Ownership type="PUBLIC" />
<Invoice name="ramya" num="1" date="2020-05-30T07:06:06+05:30" />
</Merchant>
</Payee>
</Payees>

        Technical Specification Document                               357 | P a g e

</ReqPay>

Response from IPS Participant to IPS : RespPay-Credit

<RespPay>
    <Head ver="2.0" ts="2025-09-30T16:03:39+05:30" orgId="700001"
        msgId="XYA0000000005sp20wQHPg8viLyLDS4" prodType=”UPI”/>
    <Txn id="null000000005sp20wQHPg8viLq2N5m" note="test" refId="Ref"
        refUrl="https://www.sbi.co.in/" ts="2018-03-02T16:27:44+05:30" type="CREDIT"
        custRef="527316114361" initiationMode="18" subType="PAY" purpose="10">
        <RiskScores>
            <Score provider="psp1" type="TXNRISK" value="00032" />
            <Score provider="psp3" type="TXNRISK" value="00040" />
        </RiskScores>
    </Txn>
    <Resp reqMsgId="4HItqC8XX" result="SUCCESS">
        <Ref type="PAYEE" seqNum="1" addr="payee@mypsp" settAmount="1.00" settCurrency="NAD"
            approvalNum="654321" respCode="00" regName="SonySuper" acNum="2678892001829"
            IFSC="AABY0288115" code="0000" accType="SAVINGS" />
    </Resp>
</RespPay>

Request from IPS to IPS Participant: ReqTxnConfirmation

<ReqTxnConfirmation>
    <Head ver="2.0" ts="2025-09-30T16:03:39+05:30" orgId="NPCI" msgId="4HItqC8Y2" prodType="UPI" />
    <Txn id="null000000005sp20wQHPg8viLq2N5m" note="test" refId="Ref"
        refUrl="https://www.sbi.co.in/" ts="2018-03-02T16:27:44+05:30" type="TxnConfirmation"
        orgTxnId="null000000005sp20wQHPg8viLq2N5m" custRef="527316114361" initiationMode="18"
        purpose="10" />
    <TxnConfirmation note="test" orgStatus="SUCCESS" type="PAY">
        <Ref type=" PAYER" seqNum="1" addr="payee@mypsp" settAmount="1.00" settCurrency="NAD"
            approvalNum="654321" respCode="00" regName="SonySuper" orgAmount="1.00"

        Technical Specification Document                               358 | P a g e

acNum="2678892001829" IFSC="AABY0288115" code="5310" accType="SAVINGS" cmId="" />
</TxnConfirmation>
</ReqTxnConfirmation>

Response from IPS Participant to IPS: RespTxnConfirmation

<RespTxnConfirmation>
    <Head ver="2.0" ts="2025-09-30T16:03:39+05:30" orgId="700001" msgId="d0vFQh1l0AmtLnha"
prodType="UPI" />
    <Txn id="null000000005sp20wQHPg8viLq2N5m" note="test" refId="Ref"
        refUrl="https://www.sbi.co.in/" ts="2018-03-02T16:27:44+05:30" type="TxnConfirmation"
        orgTxnId="null000000005sp20wQHPg8viLq2N5m" custRef="527316114361" initiationMode="18"
        purpose="10" />
    <Resp reqMsgId="d0vFQh1l0AmtLnha" result="SUCCESS" />
</RespTxnConfirmation>

6.22. Merchant Cash out – Pay by Merchant Id

Refer Specifications for Payment Pay API

Request from Payer IPS Participant to IPS: ReqValAdd

<ReqValAdd>
    <Head ver="2.0" ts="2025-06-13T10:32:09+02:00" orgId="700001"
        msgId="LVB2e9c06404a8d4b289dc24cdca9b0ad75" prodType="UPI" />
    <Txn id="MYSIM00000000001vRPtRTgqKsx1z0mc3NS" note="Numeric Id Mapper" refId="123456"
        refUrl="https://upaay.lvbank.in" ts="2019-03-29T14:41:48+05:30" type="ValAdd"
        custRef="LVB60a39feff0214ee0a8c5c10cc2a6c0ff" />
    <Payer addr="payer@mypsp" name="Shyam" seqNum="1" type="PERSON" code="0000">

        Technical Specification Document                               359 | P a g e

<Info>
<Identity type="PAN" verifiedName="Ram" id="SDF45645BJB22" />
<Rating verifiedAddress="TRUE"></Rating>
</Info>
<Device>
<Tag name="MOBILE" value="993456789" />
<Tag name="TYPE" value="MOB" />
<Tag name="ID" value="000000000000002" />
<Tag name="OS" value="android" />
<Tag name="APP" value="org.npci.upi.maggi" />
</Device>
</Payer>
<Payee addr="12345677@mapper.npci" seqNum="1" />
</ReqValAdd>

Request from IPS to Merchant IPS Participant: ReqValAdd

<ReqValAdd>
    <Head ver="2.0" ts="2025-06-13T10:32:10+02:00" orgId="NPCI" msgId="1xysVpClEcah" prodType="UPI"
/>
    <Txn id="MYSIM00000000001vRPtRTgqKsx1z0mc3NS" note="Numeric Id Mapper" refId="123456"
        refUrl="https://upaay.lvbank.in" ts="2019-03-29T14:41:48+05:30" type="ValAdd"
        custRef="LVB60a39feff0214ee0a8c5c10cc2a6c0ff" />
    <Payer addr="payer@mypsp" name="Shyam" seqNum="1" type="PERSON" code="0000">
        <Info>
            <Identity type="PAN" verifiedName="Ram" id="SDF45645BJB22" />
            <Rating verifiedAddress="TRUE"></Rating>
        </Info>
        <Device>
            <Tag name="MOBILE" value="993456789" />
            <Tag name="TYPE" value="MOB" />
            <Tag name="ID" value="000000000000002" />
            <Tag name="OS" value="android" />
            <Tag name="APP" value="org.npci.upi.maggi" />

        Technical Specification Document                               360 | P a g e

</Device>
</Payer>
<Payee addr="atmvpa@mypsp" seqNum="1" cmId="12345677" />
</ReqValAdd>

Response from Merchant IPS participant to IPS : RespValAdd

<RespValAdd>
    <Head ver="2.0" ts="2025-06-13T10:32:10.174+02:00" orgId="700001"
        msgId="XYA0000000000001vRPtRSgrisLb4f49QqS" prodType="UPI" />
    <Resp reqMsgId="1xysVpClEcah" result="SUCCESS" errCode="" maskName="Narayanan" code="8931"
        type="ENTITY" IFSC="HDFC0009009" IIN="500001" accType="PPIWALLET">
        <Merchant>
            <Identifier subCode="1234" mid="8394" sid="2212" tid="0101" merchantType="SMALL" />
            <Name brand="AllianceFranche" legal="Reliance" franchise="LearnFrench" />
            <Ownership type="PRIVATE" />
        </Merchant>
    </Resp>
    <Txn id="MYSIM00000000001vRPtRTgqKsx1z0mc3NS" note="Numeric Id Mapper" refId="123456"
        refUrl="https://upaay.lvbank.in" ts="2019-03-29T14:41:48+05:30" type="ValAdd"
        custRef="LVB60a39feff0214ee0a8c5c10cc2a6c0ff" />
</RespValAdd>

Response from IPS to Payer IPS Participant: RespValAdd

<RespValAdd>
    <Head ver="2.0" ts="2025-06-13T10:32:10+02:00" orgId="NPCI" msgId="1xysVpClEcaj" prodType="UPI"
/>
    <Resp reqMsgId="LVB2e9c06404a8d4b289dc24cdca9b0ad75" result="SUCCESS" errCode=""
        maskName="Narayanan" code="8931" type="ENTITY" IFSC="HDFC0009009" IIN="500001"
        accType="PPIWALLET" cmId="12345677" addr="atmvpa@mypsp">
        <Merchant>
            <Identifier subCode="1234" mid="8394" sid="2212" tid="0101" merchantType="SMALL" />
            <Name brand="AllianceFranche" legal="Reliance" franchise="LearnFrench" />
            <Ownership type="PRIVATE" />

        Technical Specification Document                               361 | P a g e

</Merchant>
</Resp>
<Txn id="MYSIM00000000001vRPtRTgqKsx1z0mc3NS" note="Numeric Id Mapper" refId="123456"
        refUrl="https://upaay.lvbank.in" ts="2019-03-29T14:41:48+05:30" type="ValAdd"
        custRef="LVB60a39feff0214ee0a8c5c10cc2a6c0ff" />
</RespValAdd>

Request from Payer IPS Participant to IPS: ReqPay - Pay

<ReqPay>
    <Head ver="2.0" ts="2025-06-13T12:48:06+02:00" orgId="700001"
        msgId="XYD0000000000001GRDpegB9EWpFIHL7Tzs" prodType="UPI" />
    <Meta>
        <Tag name="PAYREQSTART" value="2017-12-04T14:15:35+05:30" />
        <Tag name="PAYREQEND" value="2017-12-04T14:15:35+05:30" />
    </Meta>
    <Txn id="MYSIM00000001vRPtRTgqKsx1NmFqRTq" note="test" refId="Ref"
        refUrl="https://www.sbi.co.in/" ts="2018-03-02T16:27:44+05:30" type="PAY"
        custRef="516412422169" initiationMode="00" purpose="12">
        <RiskScores>
            <Score provider="psp1" type="TXNRISK" value="00032" />
            <Score provider="psp3" type="TXNRISK" value="00040" />
        </RiskScores>
    </Txn>
    <Payer addr="payer@mypsp" name="Shyam" seqNum="1" type="PERSON" code="0000">
        <Info>
            <Identity type="PAN" verifiedName="Ram" id="SDF45645BJB22" />
            <Rating verifiedAddress="TRUE"></Rating>
        </Info>
        <Device>
            <Tag name="MOBILE" value="993456789" />
            <Tag name="TYPE" value="MOB" />
            <Tag name="ID" value="000000000000002" />
            <Tag name="OS" value="android" />

        Technical Specification Document                               362 | P a g e

<Tag name="APP" value="org.npci.upi.maggi" />
</Device>
<Ac addrType="ACCOUNT">
<Detail name="IFSC" value="AABY0000382" />
<Detail name="ACTYPE" value="SAVINGS" />
<Detail name="ACNUM" value="3453454385" />
</Ac>
<Creds>
<Cred type="PIN" subType="MPIN">
<Data code="NPCI"
ki="20150822">2.0|jnjll9sU8fTVI7sHTg7Yv+UaJX8okYm0ZZqgV/5gFcYortJ61+DYLGcEyyVaP5taLuG0/xUWmuPv&#xd;
ozNz8rapuCKAsrMYI5u3A0ymVvWwSHg9TlM551xF9SQ58CWpfnOtWtzLqVY5JwfXxOMhw2QgHlJu&#xd;
h0je8tURNcmBgOlnOx8D9tw6zhKup/IaaiTNI7En4CRdo2h+OlwTBj/l41CEfJ0S7vNm78lCwLLl&#xd;
EOH32kZU47TnJyBz2bfkj3sgCXv693+R+ahcOGfhvxS+slk1Bq3vlcGWmpk1lFPIKsgSh/fRVKOg&#xd;
gkiuSQm1tSQohVTsAP8/CVTYK82QUUYQ0wc+Mw==&#xd;
</Data>
</Cred>
</Creds>
<Amount value="1.00" curr="NAD" />
</Payer>
<Payees>
<Payee addr="atmvpa@mypsp" name="ree" seqNum="1" type="PERSON" code="0000" cmId="1234567">
<Amount value="1.00" curr="NAD" />
</Payee>
</Payees>
</ReqPay>

Request from IPS to Merchant IPS Partcipant: ReqAuthDetails

<ReqAuthDetails>
    <Head ver="2.0" ts="2025-06-13T12:48:06+02:00" orgId="NPCI" msgId="1xysVpEDt7Kj" />
    <Txn id="MYSIM00000001vRPtRTgqKsx1NmFqRTq" note="test" refId="Ref"
        refUrl="https://www.sbi.co.in/" ts="2018-03-02T16:27:44+05:30" type="PAY"
        custRef="516412422169" initiationMode="00" purpose="12">

        Technical Specification Document                               363 | P a g e

<RiskScores>
<Score provider="psp1" type="TXNRISK" value="00032" />
<Score provider="psp3" type="TXNRISK" value="00040" />
</RiskScores>
</Txn>
<Payees>
<Payee addr="atmvpa@mypsp" name="ree" seqNum="1" type="PERSON" code="0000"
cmId="1234567">
<Amount value="1.00" curr="NAD" />
</Payee>
</Payees>
<Payer addr="payer@mypsp" name="Shyam" seqNum="1" type="PERSON" code="0000">
<Info>
<Identity type="PAN" verifiedName="Ram" id="SDF45645BJB22" />
<Rating verifiedAddress="TRUE"></Rating>
</Info>
<Ac addrType="ACCOUNT">
<Detail name="IFSC" value="AABY0000382" />
<Detail name="ACTYPE" value="SAVINGS" />
<Detail name="ACNUM" value="3453454385" />
</Ac>
<Amount value="1.00" curr="NAD" />
</Payer>
</ReqAuthDetails>

Response from Merchant IPS Partcipant to IPS: RespAuthDetails

<RespAuthDetails>
    <Head ver="2.0" ts="2025-06-13T12:48:06.468+02:00" orgId="700001"
        msgId="XYA0000000000001vRPtRSgrisLbiBmvGCb" />
    <Resp reqMsgId="1xysVpEDt7Kj" result="SUCCESS" />
    <Txn id="MYSIM00000001vRPtRTgqKsx1NmFqRTq" note="test" refId="Ref"
        refUrl="https://www.sbi.co.in/" ts="2018-03-02T16:27:44+05:30" type="PAY"
        custRef="516412422169" initiationMode="00" purpose="12">
        <RiskScores>

        Technical Specification Document                               364 | P a g e

<Score provider="SBI" type="TXNRISK" value="10" />
</RiskScores>
</Txn>
<Payer addr="payer@mypsp" name="Shyam" seqNum="1" type="PERSON" code="0000">
<Info>
<Identity type="PAN" verifiedName="Ram" id="SDF45645BJB22" />
<Rating verifiedAddress="TRUE"></Rating>
</Info>
<Ac addrType="ACCOUNT">
<Detail name="IFSC" value="AABY0000382" />
<Detail name="ACTYPE" value="SAVINGS" />
<Detail name="ACNUM" value="3453454385" />
</Ac>
<Amount value="1.00" curr="NAD" />
</Payer>
<Payees>
<Payee addr="atmvpa@mypsp" name="ree" seqNum="1" type="PERSON" code="0000" cmId="1234567">
<Info>
<Identity type="ACCOUNT" verifiedName="narayanan" id="AAB45645BJB15" />
<Rating verifiedAddress="TRUE"></Rating>
</Info>
<Device>
<Tag name="MOBILE" value="993456780" />
<Tag name="APP" value="org.npci.upi.maggi" />
<Tag name="TYPE" value="MOB" />
<Tag name="ID" value="0000000000000020" />
</Device>
<Ac addrType="ACCOUNT">
<Detail name="IFSC" value="AABY0000382" />
<Detail name="ACNUM" value="2678892001829" />
<Detail name="ACTYPE" value="SAVINGS" />
</Ac>
<Amount value="1.00" curr="NAD" />
</Payee>
</Payees>

        Technical Specification Document                               365 | P a g e

</RespAuthDetails>

Request from IPS to Remitter SoV Provider: ReqPay -Debit

<ReqPay>
    <Head ver="2.0" ts="2025-06-13T12:48:08+02:00" orgId="NPCI" msgId="1xysVpEDtXMb" />
    <Meta>
        <Tag name="PAYREQSTART" value="2017-12-04T14:15:35+05:30" />
        <Tag name="PAYREQEND" value="2017-12-04T14:15:35+05:30" />
    </Meta>
    <Txn id="MYSIM00000001vRPtRTgqKsx1NmFqRTq" note="test" refId="Ref"
        refUrl="https://www.sbi.co.in/" ts="2018-03-02T16:27:44+05:30" type="DEBIT"
        custRef="516412422169" initiationMode="00" subType="PAY" purpose="12">
        <RiskScores>
            <Score provider="psp1" type="TXNRISK" value="00032" />
            <Score provider="psp3" type="TXNRISK" value="00040" />
            <Score provider="NPCI" type="TXNRISK" value="00999" />
        </RiskScores>
    </Txn>
    <Payer addr="payer@mypsp" name="Shyam" seqNum="1" type="PERSON" code="0000">
        <Info>
            <Identity type="PAN" verifiedName="Ram" id="SDF45645BJB22" />
            <Rating verifiedAddress="TRUE"></Rating>
        </Info>
        <Device>
            <Tag name="MOBILE" value="993456789" />
            <Tag name="TYPE" value="MOB" />
            <Tag name="ID" value="000000000000002" />
            <Tag name="OS" value="android" />
            <Tag name="APP" value="org.npci.upi.maggi" />
        </Device>
        <Ac addrType="ACCOUNT">

        Technical Specification Document                               366 | P a g e

<Detail name="IFSC" value="AABY0000382" />
<Detail name="ACTYPE" value="SAVINGS" />
<Detail name="ACNUM" value="3453454385" />
</Ac>
<Creds>
<Cred type="PIN" subType="MPIN">
<Data code="700001" ki="20160217">

T44gWG7u79OR9ySVA4M+2avbc1xSvEyx5sDy34xDiQsSU0NFCnlCNtbz279H5Y0L166z3sLQ+pfQxgJ/+QWPB69ddbVgpyl8sfn/f
rXH8NeBwbXP1BI/l7JgfyzdYCUyAfDaPv8Kg6Ajn7cNxBTLv/lw7fv5TH0Iwbb0w0u2t505VLO3nfKLgT1D85Y+BY8jYTo7GfMcH8
rYIdsIuyq3Wiqvd5lWeYttY8357K/HBum1IqsS0pHl46GxQDFcv1dswvuhXF/3EwQKKgm1VLtoche34XivFjJ1QDy4t5Zykqkh4v7
zkvbIwLs8g8eB40fC2cvEhgTLtER9h0BSz5qsrg==</Data>
</Cred>
</Creds>
<Amount value="1.00" curr="NAD" />
</Payer>
<Payees>
<Payee addr="atmvpa@mypsp" name="ree" seqNum="1" type="PERSON" code="0000" cmId="1234567">
<Info>
<Identity type="ACCOUNT" verifiedName="narayanan" id="AAB45645BJB15" />
<Rating verifiedAddress="TRUE"></Rating>
</Info>
<Device>
<Tag name="MOBILE" value="993456780" />
<Tag name="APP" value="org.npci.upi.maggi" />
<Tag name="TYPE" value="MOB" />
<Tag name="ID" value="0000000000000020" />
</Device>
<Ac addrType="ACCOUNT">
<Detail name="IFSC" value="AABY0000382" />
<Detail name="ACNUM" value="2678892001829" />
<Detail name="ACTYPE" value="SAVINGS" />
</Ac>
<Amount value="1.00" curr="NAD" />
</Payee>

        Technical Specification Document                               367 | P a g e

</Payees>
</ReqPay>

Response from Remitter Bank to IPS : RespPay Debit

<RespPay>
    <Head ver="2.0" ts="2025-06-13T12:48:08+02:00" orgId="700001"
        msgId="XYA0000000001vRPtRSgrisLbiBAdm76" />
    <Txn id="MYSIM00000001vRPtRTgqKsx1NmFqRTq" note="test" refId="Ref"
        refUrl="https://www.sbi.co.in/" ts="2018-03-02T16:27:44+05:30" type="DEBIT"
        custRef="516412422169" initiationMode="00" subType="PAY" purpose="12">
        <RiskScores>
            <Score provider="psp1" type="TXNRISK" value="00032" />
            <Score provider="psp3" type="TXNRISK" value="00040" />
            <Score provider="NPCI" type="TXNRISK" value="00999" />
        </RiskScores>
    </Txn>
    <Resp reqMsgId="1xysVpEDtXMb" result="SUCCESS">
        <Ref type="PAYER" seqNum="1" addr="payer@mypsp" settAmount="1.00" settCurrency="NAD"
            approvalNum="654321" respCode="00" regName="Shyam" acNum="3453454385" IFSC="AABY0000382"
            code="0000" accType="SAVINGS" />
    </Resp>
</RespPay>

Request from IPS to Beneficiary Sov Provider: ReqPay-Credit

<ReqPay>
    <Head ver="2.0" ts="2025-06-13T12:48:08+02:00" orgId="NPCI" msgId="1xysVpEDtXMd" />
    <Meta>
        <Tag name="PAYREQSTART" value="2017-12-04T14:15:35+05:30" />
        <Tag name="PAYREQEND" value="2017-12-04T14:15:35+05:30" />
    </Meta>
    <Txn id="MYSIM00000001vRPtRTgqKsx1NmFqRTq" note="test" refId="Ref"

        Technical Specification Document                               368 | P a g e

refUrl="https://www.sbi.co.in/" ts="2018-03-02T16:27:44+05:30" type="CREDIT"
custRef="516412422169" initiationMode="00" subType="PAY" purpose="12">
<RiskScores>
<Score provider="psp1" type="TXNRISK" value="00032" />
<Score provider="psp3" type="TXNRISK" value="00040" />
<Score provider="NPCI" type="TXNRISK" value="00999" />
</RiskScores>
</Txn>
<Payer addr="payer@mypsp" name="Shyam" seqNum="1" type="PERSON" code="0000">
<Info>
<Identity type="PAN" verifiedName="Ram" id="SDF45645BJB22" />
<Rating verifiedAddress="TRUE"></Rating>
</Info>
<Device>
<Tag name="MOBILE" value="993456789" />
<Tag name="TYPE" value="MOB" />
<Tag name="ID" value="000000000000002" />
<Tag name="OS" value="android" />
<Tag name="APP" value="org.npci.upi.maggi" />
</Device>
<Ac addrType="ACCOUNT">
<Detail name="IFSC" value="AABY0000382" />
<Detail name="ACTYPE" value="SAVINGS" />
<Detail name="ACNUM" value="3453454385" />
</Ac>
<Amount value="1.00" curr="NAD" />
</Payer>
<Payees>
<Payee addr="atmvpa@mypsp" name="ree" seqNum="1" type="PERSON" code="0000" cmId="1234567">
<Info>
<Identity type="ACCOUNT" verifiedName="narayanan" id="AAB45645BJB15" />
<Rating verifiedAddress="TRUE"></Rating>
</Info>
<Device>
<Tag name="MOBILE" value="993456780" />

        Technical Specification Document                               369 | P a g e

<Tag name="APP" value="org.npci.upi.maggi" />
<Tag name="TYPE" value="MOB" />
<Tag name="ID" value="0000000000000020" />
</Device>
<Ac addrType="ACCOUNT">
<Detail name="IFSC" value="AABY0000382" />
<Detail name="ACNUM" value="2678892001829" />
<Detail name="ACTYPE" value="SAVINGS" />
</Ac>
<Amount value="1.00" curr="NAD" />
</Payee>
</Payees>
</ReqPay>

Response from Beneficiary Sov Provider to IPS: ReqPay-Credit

<RespPay>
    <Head ver="2.0" ts="2025-06-13T12:48:08+02:00" orgId="700001"
        msgId="XYA0000000001vRPtRSgrisLbiBAhyga" />
    <Txn id="MYSIM00000001vRPtRTgqKsx1NmFqRTq" note="test" refId="Ref"
        refUrl="https://www.sbi.co.in/" ts="2018-03-02T16:27:44+05:30" type="CREDIT"
        custRef="516412422169" initiationMode="00" subType="PAY" purpose="12">
        <RiskScores>
            <Score provider="psp1" type="TXNRISK" value="00032" />
            <Score provider="psp3" type="TXNRISK" value="00040" />
            <Score provider="NPCI" type="TXNRISK" value="00999" />
        </RiskScores>
    </Txn>
    <Resp reqMsgId="1xysVpEDtXMd" result="SUCCESS">
        <Ref type="PAYEE" seqNum="1" addr="atmvpa@mypsp" settAmount="1.00" settCurrency="NAD"
            approvalNum="654321" respCode="00" regName="ree" acNum="2678892001829"
            IFSC="AABY0000382" code="0000" accType="SAVINGS" />
    </Resp>
</RespPay>

        Technical Specification Document                               370 | P a g e

Response from IPS to Payer IPS Participant: RespPay-PAY

<RespPay>
    <Head ver="2.0" ts="2025-06-13T12:48:08+02:00" orgId="NPCI" msgId="1xysVpEDtXMf" />
    <Txn id="MYSIM00000001vRPtRTgqKsx1NmFqRTq" note="test" refId="Ref"
        refUrl="https://www.sbi.co.in/" ts="2018-03-02T16:27:44+05:30" type="PAY"
        custRef="516412422169" initiationMode="00" purpose="12">
        <RiskScores>
            <Score provider="psp1" type="TXNRISK" value="00032" />
            <Score provider="psp3" type="TXNRISK" value="00040" />
            <Score provider="NPCI" type="TXNRISK" value="00999" />
        </RiskScores>
    </Txn>
    <Resp reqMsgId="XYD0000000000001GRDpegB9EWpFIHL7Tzs" result="SUCCESS">
        <Ref type="PAYER" seqNum="1" addr="payer@mypsp" settAmount="1.00" settCurrency="NAD"
            approvalNum="654321" respCode="00" regName="Shyam" orgAmount="1.00" acNum="3453454385"
            IFSC="AABY0000382" code="0000" accType="SAVINGS" />
        <Ref type="PAYEE" seqNum="1" addr="atmvpa@mypsp" settAmount="1.00" settCurrency="NAD"
            approvalNum="654321" respCode="00" regName="ree" orgAmount="1.00" acNum="2678892001829"
            IFSC="AABY0000382" code="0000" accType="SAVINGS" cmId="1234567" />
    </Resp>
</RespPay>

Transaction Confirmation Request from IPS to Merchant IPS Participant:

<ReqTxnConfirmation>
    <Head ver="2.0" ts="2025-06-13T12:48:08+02:00" orgId="NPCI" msgId="1xysVpEDtXMi" />
    <Txn id="MYSIM00000001vRPtRTgqKsx1NmFqRTq" note="test" refId="Ref"
        refUrl="https://www.sbi.co.in/" ts="2018-03-02T16:27:44+05:30" type="TxnConfirmation"
        orgTxnId="MYSIM00000001vRPtRTgqKsx1NmFqRTq" custRef="516412422169" initiationMode="00"

        Technical Specification Document                               371 | P a g e

purpose="12" />
<TxnConfirmation note="test" orgStatus="SUCCESS" type="PAY">
<Ref type="PAYEE" seqNum="1" addr="atmvpa@mypsp" settAmount="1.00" settCurrency="NAD"
            approvalNum="654321" respCode="00" regName="ree" orgAmount="1.00" acNum="2678892001829"
            IFSC="AABY0000382" code="0000" accType="SAVINGS" cmId="1234567" />
</TxnConfirmation>
</ReqTxnConfirmation>

Transaction Confirmation Response from Merchant IPS Participant to IPS:

<RespTxnConfirmation>
    <Head ver="2.0" ts="2025-06-13T12:48:08+02:00" orgId="700001" msgId="3BIhGBUToWeEEKLMA" />
    <Txn id="MYSIM00000001vRPtRTgqKsx1NmFqRTq" note="test" refId="Ref"
        refUrl="https://www.sbi.co.in/" ts="2018-03-02T16:27:44+05:30" type="TxnConfirmation"
        orgTxnId="MYSIM00000001vRPtRTgqKsx1NmFqRTq" custRef="516412422169" initiationMode="00"
        purpose="12" />
    <Resp reqMsgId="3BIhGBUToWeEEKLMA" result="SUCCESS" />
</RespTxnConfirmation>

        Technical Specification Document                               372 | P a g e

6.23. Payment Request – Pay by Mobile Number

Request from Payer IPS Participant to IPS :

<ReqValAdd>
    <Head ver="2.0" ts="2025-07-18T16:41:56+05:30" orgId="700001"
msgId="LVB2e9c06404a8d4b289dc24cdca9b0ad75" prodType="UPI"/>
    <Txn id="MYSIM00000000005sp20ulJcgEXzBV5m48" note="Validate vpa" refId="123456"
refUrl="https://upaay.lvbank.in" ts="2019-03-29T14:41:48+05:30" type="ValAdd"
custRef="LVB60a39feff0214ee0a8c5c10cc2a6c0ff"/>
    <Payer addr="mapperchk@mypsp" name="asimg" seqNum="1" type="PERSON" code="0000">
        <Info>
            <Identity type="ACCOUNT" verifiedName="PALANIVEL K" id="123456789"/>
            <Rating verifiedAddress="TRUE"></Rating>
        </Info>
        <Device>
            <Tag name="MOBILE" value="993456789"/>
            <Tag name="TYPE" value="MOB"/>
            <Tag name="ID" value="000000000000002"/>
            <Tag name="OS" value="android"/>
            <Tag name="APP" value="org.npci.upi.maggi"/>
            <Tag name="GEOCODE" value="22.5767335,88.4344541"/>
            <Tag name="LOCATION" value="9, Street Number 10, DN Block, Sector V,"/>
            <Tag name="IP" value="10.22.205.176"/>
            <Tag name="CAPABILITY" value="100"/>
        </Device>
    </Payer>
    <Payee addr="993456789@mapper.npci" seqNum="1"/>
</ReqValAdd>

        Technical Specification Document                               373 | P a g e

Request from IPS to Payee IPS Participant:

<ReqValAdd>
    <Head ver="2.0" ts="2025-07-18T16:41:56+05:30" orgId="NPCI" msgId="4FCcfq4NJ" prodType="UPI"/>
    <Txn id="MYSIM00000000005sp20ulJcgEXzBV5m48" note="Validate vpa" refId="123456"
refUrl="https://upaay.lvbank.in" ts="2019-03-29T14:41:48+05:30" type="ValAdd"
custRef="LVB60a39feff0214ee0a8c5c10cc2a6c0ff"/>
    <Payer addr="mapperchk@mypsp" name="asimg" seqNum="1" type="PERSON" code="0000">
        <Info>
            <Identity type="ACCOUNT" verifiedName="PALANIVEL K" id="123456789"/>
            <Rating verifiedAddress="TRUE"></Rating>
        </Info>
        <Device>
            <Tag name="MOBILE" value="993456789"/>
            <Tag name="TYPE" value="MOB"/>
            <Tag name="ID" value="000000000000002"/>
            <Tag name="OS" value="android"/>
            <Tag name="APP" value="org.npci.upi.maggi"/>
            <Tag name="GEOCODE" value="22.5767335,88.4344541"/>
            <Tag name="LOCATION" value="9, Street Number 10, DN Block, Sector V,"/>
            <Tag name="IP" value="10.22.205.176"/>
            <Tag name="CAPABILITY" value="100"/>
        </Device>
    </Payer>
    <Payee addr="mappervpatest@mypsp" seqNum="1" cmId="993456789"/>
</ReqValAdd>

Response from Payee IPS Participant to IPS:

<RespValAdd>
    <Head ver="2.0" ts="2025-07-18T16:41:57.154+05:30" orgId="700001"
msgId="XYA0000000000005sp20ulJcgEXzBZuVz2" prodType="UPI"/>

        Technical Specification Document                               374 | P a g e

<Resp reqMsgId="4FCcfq4NJ" result="SUCCESS" errCode="" maskName="Narayanan" code="0000"
type="PERSON" IFSC="HDFC0009009" IIN="500001" accType="SAVINGS"/>
<Txn id="MYSIM00000000005sp20ulJcgEXzBV5m48" note="Validate vpa" refId="123456"
refUrl="https://upaay.lvbank.in" ts="2019-03-29T14:41:48+05:30" type="ValAdd"
custRef="LVB60a39feff0214ee0a8c5c10cc2a6c0ff"/>
</RespValAdd>

Response from IPS to Payer IPS Participant :

<RespValAdd>
    <Head ver="2.0" ts="2025-07-18T16:41:57+05:30" orgId="NPCI" msgId="4FCcfquOF" prodType="UPI"/>
    <Resp reqMsgId="LVB2e9c06404a8d4b289dc24cdca9b0ad75" result="SUCCESS" errCode=""
maskName="Narayanan" code="0000" type="PERSON" IFSC="HDFC0009009" IIN="500001" accType="SAVINGS"
cmId="993456789" addr="mappervpatest@mypsp"/>
    <Txn id="MYSIM00000000005sp20ulJcgEXzBV5m48" note="Validate vpa" refId="123456"
refUrl="https://upaay.lvbank.in" ts="2019-03-29T14:41:48+05:30" type="ValAdd"
custRef="LVB60a39feff0214ee0a8c5c10cc2a6c0ff"/>
</RespValAdd>

Payment Request from Payer IPS Participant to IPS: ReqPay with type="PAY"

<ReqPay>
    <Head ver="2.0" ts="2025-07-18T16:47:05+05:30" orgId="700001"
msgId="XYD0000000000001GRDpegB9EWpFIHL7Tzs" prodType="UPI"/>
    <Meta>
        <Tag name="PAYREQSTART" value="2017-12-04T14:15:35+05:30"/>
        <Tag name="PAYREQEND" value="2017-12-04T14:15:35+05:30"/>
    </Meta>
    <Txn id="MYSIM00000005sp20ulJcgEXA9D4L3W" note="test" refId="Ref"
refUrl="https://www.sbi.co.in/" ts="2018-03-02T16:27:44+05:30" type="PAY" custRef="519916126323"
initiationMode="00" purpose="00">
        <RiskScores>
            <Score provider="psp1" type="TXNRISK" value="00032"/>
            <Score provider="psp3" type="TXNRISK" value="00040"/>

        Technical Specification Document                               375 | P a g e

</RiskScores>
</Txn>
<Payer addr="mapperchk@mypsp" name="Shyam" seqNum="1" type="PERSON" code="0000">
<Info>
<Identity type="PAN" verifiedName="Ram" id="SDF45645BJB22"/>
<Rating verifiedAddress="TRUE"></Rating>
</Info>
<Device>
<Tag name="MOBILE" value="993456789"/>
<Tag name="TYPE" value="MOB"/>
<Tag name="ID" value="000000000000002"/>
<Tag name="OS" value="android"/>
<Tag name="APP" value="org.npci.upi.maggi"/>
</Device>
<Ac addrType="ACCOUNT">
<Detail name="IFSC" value="AABY0000382"/>
<Detail name="ACTYPE" value="SAVINGS"/>
<Detail name="ACNUM" value="3453454385"/>
</Ac>
<Creds>
<Cred type="PIN" subType="MPIN">
<Data code="NPCI"
ki="20150822">2.2.nipl|cd8NtQbGxAYHDMCq8H8UjJJEbhongzaEVdwHP8kR1dd+4aGgdL8Cw1hVc1Ai4TB9zdQByFq0D4lT
&#xd;
tif5gXva3GVo5IKneiyqyibrf7tBF+pQ4ZuOF8HDWFdZaXcyJGyIov4zSHjQ29te54o4mKfCwRyb&#xd;
O5OZP8y9QJhAmpSkSt7j0msefGp8TlOLLJkovt5w3YVts6R/GEGXuhL7mig5qlKzgufR/riUNJub&#xd;
pjlkn8cKAtgS9nx4h3X31KcUXyj+QF3u5CfY5ZiGG39bErcpWXjRSkcDY7i/NGiaBEr7c7cRzcmf&#xd;
X5HI7sIBaCXOiInyTKoM1LdcsoDBlRhloqTbIQ==&#xd;
</Data>
</Cred>
</Creds>
<Amount value="1.00" curr="NAD"/>
</Payer>
<Payees>

        Technical Specification Document                               376 | P a g e

<Payee addr="mappervpatest@mypsp" name="SonySuper" seqNum="1" type="PERSON" code="0000"
cmId="993456789">
<Amount value="1.00" curr="NAD"/>
</Payee>
</Payees>
</ReqPay>

Payment AuthDetails Request from IPS to Payee IPS Participant: ReqAuthDetails

<ReqAuthDetails>
    <Head ver="2.0" ts="2025-07-18T16:47:05+05:30" orgId="NPCI" msgId="4FCchvJjy" prodType="UPI"/>
    <Txn id="MYSIM00000005sp20ulJcgEXA9D4L3W" note="test" refId="Ref"
refUrl="https://www.sbi.co.in/" ts="2018-03-02T16:27:44+05:30" type="PAY" custRef="519916126323"
initiationMode="00" purpose="00">
        <RiskScores>
            <Score provider="psp1" type="TXNRISK" value="00032"/>
            <Score provider="psp3" type="TXNRISK" value="00040"/>
        </RiskScores>
    </Txn>
    <Payees>
        <Payee addr="mappervpatest@mypsp" name="SonySuper" seqNum="1" type="PERSON" code="0000"
cmId="993456789">
            <Amount value="1.00" curr="NAD"/>
        </Payee>
    </Payees>
    <Payer addr="mapperchk@mypsp" name="Shyam" seqNum="1" type="PERSON" code="0000">
        <Info>
            <Identity type="PAN" verifiedName="Ram" id="SDF45645BJB22"/>
            <Rating verifiedAddress="TRUE"></Rating>
        </Info>
        <Ac addrType="ACCOUNT">
            <Detail name="IFSC" value="AABY0000382"/>
            <Detail name="ACTYPE" value="SAVINGS"/>
            <Detail name="ACNUM" value="3453454385"/>

        Technical Specification Document                               377 | P a g e

</Ac>
<Amount value="1.00" curr="NAD"/>
</Payer>
</ReqAuthDetails>

Payment Auth Details Response from Payee IPS Participant to IPS: RespAuthDetails

<RespAuthDetails>
    <Head ver="2.0" ts="2025-07-18T16:47:05.930+05:30" orgId="700001"
msgId="XYA0000000000005sp20ulJcgEXA9Fqm7r" prodType="UPI"/>
    <Resp reqMsgId="4FCchvJjy" result="SUCCESS"/>
    <Txn id="MYSIM00000005sp20ulJcgEXA9D4L3W" note="test" refId="Ref"
refUrl="https://www.sbi.co.in/" ts="2018-03-02T16:27:44+05:30" type="PAY" custRef="519916126323"
initiationMode="00" purpose="00">
        <RiskScores>
            <Score provider="SBI" type="TXNRISK" value="10"/>
        </RiskScores>
    </Txn>
    <Payer addr="mapperchk@mypsp" name="Shyam" seqNum="1" type="PERSON" code="0000">
        <Info>
            <Identity type="PAN" verifiedName="Ram" id="SDF45645BJB22"/>
            <Rating verifiedAddress="TRUE"></Rating>
        </Info>
        <Ac addrType="ACCOUNT">
            <Detail name="IFSC" value="AABY0000382"/>
            <Detail name="ACTYPE" value="SAVINGS"/>
            <Detail name="ACNUM" value="3453454385"/>
        </Ac>
        <Amount value="1.00" curr="NAD"/>
    </Payer>
    <Payees>
        <Payee addr="mappervpatest@mypsp" name="SonySuper" seqNum="1" type="PERSON" code="0000"
cmId="993456789">
            <Info>

        Technical Specification Document                               378 | P a g e

<Identity type="ACCOUNT" verifiedName="narayanan" id="AAB45645BJB15"/>
<Rating verifiedAddress="TRUE"></Rating>
</Info>
<Device>
<Tag name="MOBILE" value="993456780"/>
<Tag name="APP" value="org.npci.upi.maggi"/>
<Tag name="TYPE" value="MOB"/>
<Tag name="ID" value="0000000000000020"/>
</Device>
<Ac addrType="ACCOUNT">
<Detail name="IFSC" value="AABY0000382"/>
<Detail name="ACNUM" value="2678892001829"/>
<Detail name="ACTYPE" value="SAVINGS"/>
</Ac>
<Amount value="1.00" curr="NAD"/>
</Payee>
</Payees>
</RespAuthDetails>

Debit Request from IPS to Payer SoV Provider: ReqPay with type="DEBIT"

<ReqPay>
    <Head ver="2.0" ts="2025-07-18T16:47:07+05:30" orgId="NPCI" msgId="4FCchwzlq" prodType="UPI"/>
    <Meta>
        <Tag name="PAYREQSTART" value="2017-12-04T14:15:35+05:30"/>
        <Tag name="PAYREQEND" value="2017-12-04T14:15:35+05:30"/>
    </Meta>
    <Txn id="MYSIM00000005sp20ulJcgEXA9D4L3W" note="test" refId="Ref"
refUrl="https://www.sbi.co.in/" ts="2018-03-02T16:27:44+05:30" type="DEBIT" custRef="519916126323"
initiationMode="00" subType="PAY" purpose="00">
        <RiskScores>
            <Score provider="psp1" type="TXNRISK" value="00032"/>
            <Score provider="psp3" type="TXNRISK" value="00040"/>
            <Score provider="NPCI" type="TXNRISK" value="00999"/>

        Technical Specification Document                               379 | P a g e

</RiskScores>
</Txn>
<Payer addr="mapperchk@mypsp" name="Shyam" seqNum="1" type="PERSON" code="0000">
<Info>
<Identity type="PAN" verifiedName="Ram" id="SDF45645BJB22"/>
<Rating verifiedAddress="TRUE"></Rating>
</Info>
<Device>
<Tag name="MOBILE" value="993456789"/>
<Tag name="TYPE" value="MOB"/>
<Tag name="ID" value="000000000000002"/>
<Tag name="OS" value="android"/>
<Tag name="APP" value="org.npci.upi.maggi"/>
</Device>
<Ac addrType="ACCOUNT">
<Detail name="IFSC" value="AABY0000382"/>
<Detail name="ACTYPE" value="SAVINGS"/>
<Detail name="ACNUM" value="3453454385"/>
</Ac>
<Creds>
<Cred type="PIN" subType="MPIN">
<Data code="700001"
ki="20160218">pUuLpBO1yZtowsI1rkH8EPa6jOC5QMEfYQ6Qv7bv2TdbP3SnYGJHJqcqpLxdI5K36sDAvbuNLXcMFk4IU1Fi9
iYqSr3zBJXIp4aMZtFdBTfGEIukEHsIrTX8IEekDzFnobBnZzzVeBToFGZOFFBdm5oj3OZqe+sWex/ZAQPypHiuy1i4PtD89yAo
VtlV5u1FJb1N1NPkwOv4AH33iScYoCSItcEcRO9O72vV76Kl0RW/oXaYKikotGqSPh5CrQCXzA3OwDiTqRHmthJIeVEZEpP3aey
Dh4ePgSarIGLE0n1ebZT/rtY0+dCuq+p76Qgd2Ft9O7Ubk4qXs90cblaNFA==</Data>
</Cred>
</Creds>
<Amount value="1.00" curr="NAD"/>
</Payer>
<Payees>
<Payee addr="mappervpatest@mypsp" name="SonySuper" seqNum="1" type="PERSON" code="0000"
cmId="993456789">
<Info>
<Identity type="ACCOUNT" verifiedName="narayanan" id="AAB45645BJB15"/>

        Technical Specification Document                               380 | P a g e

<Rating verifiedAddress="TRUE"></Rating>
</Info>
<Device>
<Tag name="MOBILE" value="993456780"/>
<Tag name="APP" value="org.npci.upi.maggi"/>
<Tag name="TYPE" value="MOB"/>
<Tag name="ID" value="0000000000000020"/>
</Device>
<Ac addrType="ACCOUNT">
<Detail name="IFSC" value="AABY0000382"/>
<Detail name="ACNUM" value="2678892001829"/>
<Detail name="ACTYPE" value="SAVINGS"/>
</Ac>
<Amount value="1.00" curr="NAD"/>
</Payee>
</Payees>
</ReqPay>

Debit Response from Payer SoV Provider to IPS: RespPay with type="DEBIT"

<RespPay>
    <Head ver="2.0" ts="2025-07-18T16:47:08+05:30" orgId="700001"
msgId="XYA0000000005sp20ulJcgEXA9TzIA3" prodType="UPI"/>
    <Txn id="MYSIM00000005sp20ulJcgEXA9D4L3W" note="test" refId="Ref"
refUrl="https://www.sbi.co.in/" ts="2018-03-02T16:27:44+05:30" type="DEBIT" custRef="519916126323"
initiationMode="00" subType="PAY" purpose="00">
        <RiskScores>
            <Score provider="psp1" type="TXNRISK" value="00032"/>
            <Score provider="psp3" type="TXNRISK" value="00040"/>
            <Score provider="NPCI" type="TXNRISK" value="00999"/>
        </RiskScores>
    </Txn>
    <Resp reqMsgId="4FCchwzlq" result="SUCCESS">

        Technical Specification Document                               381 | P a g e

<Ref type="PAYER" seqNum="1" addr="mapperchk@mypsp" settAmount="1.00" settCurrency="NAD"
approvalNum="654321" respCode="00" regName="Shyam" acNum="3453454385" IFSC="AABY0000382"
code="0000" accType="SAVINGS" />
</Resp>
</RespPay>

Credit Request from IPS to Payee SoV Provider: ReqPay with type="CREDIT"

<ReqPay>
    <Head ver="2.0" ts="2025-07-18T16:47:08+05:30" orgId="NPCI" msgId="4FCchwZmm" prodType="UPI"/>
    <Meta>
        <Tag name="PAYREQSTART" value="2017-12-04T14:15:35+05:30"/>
        <Tag name="PAYREQEND" value="2017-12-04T14:15:35+05:30"/>
    </Meta>
    <Txn id="MYSIM00000005sp20ulJcgEXA9D4L3W" note="test" refId="Ref"
refUrl="https://www.sbi.co.in/" ts="2018-03-02T16:27:44+05:30" type="CREDIT" custRef="519916126323"
initiationMode="00" subType="PAY" purpose="00">
        <RiskScores>
            <Score provider="psp1" type="TXNRISK" value="00032"/>
            <Score provider="psp3" type="TXNRISK" value="00040"/>
            <Score provider="NPCI" type="TXNRISK" value="00999"/>
        </RiskScores>
    </Txn>
    <Payer addr="mapperchk@mypsp" name="Shyam" seqNum="1" type="PERSON" code="0000">
        <Info>
            <Identity type="PAN" verifiedName="Ram" id="SDF45645BJB22"/>
            <Rating verifiedAddress="TRUE"></Rating>
        </Info>
        <Device>
            <Tag name="MOBILE" value="993456789"/>
            <Tag name="TYPE" value="MOB"/>
            <Tag name="ID" value="000000000000002"/>
            <Tag name="OS" value="android"/>
            <Tag name="APP" value="org.npci.upi.maggi"/>

        Technical Specification Document                               382 | P a g e

</Device>
<Ac addrType="ACCOUNT">
<Detail name="IFSC" value="AABY0000382"/>
<Detail name="ACTYPE" value="SAVINGS"/>
<Detail name="ACNUM" value="3453454385"/>
</Ac>
<Amount value="1.00" curr="NAD"/>
</Payer>
<Payees>
<Payee addr="mappervpatest@mypsp" name="SonySuper" seqNum="1" type="PERSON" code="0000"
cmId="993456789">
<Info>
<Identity type="ACCOUNT" verifiedName="narayanan" id="AAB45645BJB15"/>
<Rating verifiedAddress="TRUE"></Rating>
</Info>
<Device>
<Tag name="MOBILE" value="993456780"/>
<Tag name="APP" value="org.npci.upi.maggi"/>
<Tag name="TYPE" value="MOB"/>
<Tag name="ID" value="0000000000000020"/>
</Device>
<Ac addrType="ACCOUNT">
<Detail name="IFSC" value="AABY0000382"/>
<Detail name="ACNUM" value="2678892001829"/>
<Detail name="ACTYPE" value="SAVINGS"/>
</Ac>
<Amount value="1.00" curr="NAD"/>
</Payee>
</Payees>
</ReqPay>

        Technical Specification Document                               383 | P a g e

Credit Response from Payee SoV Provider to IPS: RespPay with type="CREDIT"

<RespPay>
    <Head ver="2.0" ts="2025-07-18T16:47:08+05:30" orgId="700001"
msgId="XYA0000000005sp20ulJcgEXA9TLsZn" prodType="UPI"/>
    <Txn id="MYSIM00000005sp20ulJcgEXA9D4L3W" note="test" refId="Ref"
refUrl="https://www.sbi.co.in/" ts="2018-03-02T16:27:44+05:30" type="CREDIT" custRef="519916126323"
initiationMode="00" subType="PAY" purpose="00">
        <RiskScores>
            <Score provider="psp1" type="TXNRISK" value="00032"/>
            <Score provider="psp3" type="TXNRISK" value="00040"/>
            <Score provider="NPCI" type="TXNRISK" value="00999"/>
        </RiskScores>
    </Txn>
    <Resp reqMsgId="4FCchwZmm" result="SUCCESS">
        <Ref type="PAYEE" seqNum="1" addr="mappervpatest@mypsp" settAmount="1.00"
settCurrency="NAD" approvalNum="654321" respCode="00" regName="SonySuper" acNum="2678892001829"
IFSC="AABY0000382" code="0000" accType="SAVINGS"/>
    </Resp>
</RespPay>

Final Response Pay from IPS to Payer IPS Partcipant:

<RespPay>
    <Head ver="2.0" ts="2025-07-18T16:47:08+05:30" orgId="NPCI" msgId="4FCchwZmo" prodType="UPI"/>
    <Txn id="MYSIM00000005sp20ulJcgEXA9D4L3W" note="test" refId="Ref"
refUrl="https://www.sbi.co.in/" ts="2018-03-02T16:27:44+05:30" type="PAY" custRef="519916126323"
initiationMode="00" purpose="00">
        <RiskScores>
            <Score provider="psp1" type="TXNRISK" value="00032"/>
            <Score provider="psp3" type="TXNRISK" value="00040"/>

        Technical Specification Document                               384 | P a g e

<Score provider="NPCI" type="TXNRISK" value="00999"/>
</RiskScores>
</Txn>
<Resp reqMsgId="XYD0000000000001GRDpegB9EWpFIHL7Tzs" result="SUCCESS">
<Ref type="PAYER" seqNum="1" addr="mapperchk@mypsp" settAmount="1.00" settCurrency="NAD"
approvalNum="654321" respCode="00" regName="Shyam" orgAmount="1.00" acNum="3453454385"
IFSC="AABY0000382" code="0000" accType="SAVINGS" />
<Ref type="PAYEE" seqNum="1" addr="mappervpatest@mypsp" settAmount="1.00"
settCurrency="NAD" approvalNum="654321" respCode="00" regName="SonySuper" orgAmount="1.00"
acNum="2678892001829" IFSC="AABY0000382" code="0000" accType="SAVINGS" cmId="993456789"/>
</Resp>
</RespPay>

TransactionConfirmation Request from IPS to Payee IPS Participant:

<ReqTxnConfirmation>
    <Head ver="2.0" ts="2025-07-18T16:47:08+05:30" orgId="NPCI" msgId="4FCchwZmr" prodType="UPI"/>
    <Txn id="MYSIM00000005sp20ulJcgEXA9D4L3W" note="test" refId="Ref"
refUrl="https://www.sbi.co.in/" ts="2018-03-02T16:27:44+05:30" type="TxnConfirmation"
orgTxnId="MYSIM00000005sp20ulJcgEXA9D4L3W" custRef="519916126323" initiationMode="00"
purpose="00"/>
    <TxnConfirmation note="test" orgStatus="SUCCESS" type="PAY">
        <Ref type="PAYEE" seqNum="1" addr="mappervpatest@mypsp" settAmount="1.00"
settCurrency="NAD" approvalNum="654321" respCode="00" regName="SonySuper" orgAmount="1.00"
acNum="2678892001829" IFSC="AABY0000382" code="0000" accType="SAVINGS" cmId="993456789"/>
    </TxnConfirmation>
</ReqTxnConfirmation>

        Technical Specification Document                               385 | P a g e

TransactionConfirmation Response from Payee IPS Participant to IPS:

<RespTxnConfirmation>
    <Head ver="2.0" ts="2025-07-18T16:47:08+05:30" orgId="700001" msgId="d0vFQb3W1OKJHQA6"
prodType="UPI"/>
    <Txn id="MYSIM00000005sp20ulJcgEXA9D4L3W" note="test" refId="Ref"
refUrl="https://www.sbi.co.in/" ts="2018-03-02T16:27:44+05:30" type="TxnConfirmation"

orgTxnId="MYSIM00000005sp20ulJcgEXA9D4L3W" custRef="519916126323" initiationMode="00"
purpose="00"/>
<Resp reqMsgId="d0vFQb3W1OKJHQA6" result="SUCCESS"/>
</RespTxnConfirmation>

6.24. Sample Negative Scenario Logs:

6.24.1.1. Multiple Error Code in Acknowledgement

Payment Request:

<ReqPay>
    <Head ver="2.0" ts="2025-08-21T14:34:38+05:30" orgId="700001"
msgId="XYD0000000000001GRDpegB9EWpFIHL7Tzs"/>
    <Meta>
        <Tag name="PAYREQSTART" value="2017-12-04T14:15:35+05:30"/>
        <Tag name="PAYREQEND" value="2017-12-04T14:15:35+05:30"/>
    </Meta>
    <Txn id="MYSIM00000005sp4lozf8btWd0vJTIQ" note="REQRESPCRDFAILURE" refId="Ref"
refUrl="https://www.sbi.co.in/" ts="2018-03-02T16:27:44+05:30" type="PAY" custRef="523314230610"
initiationMode="00" purpose="14">
        <RiskScores>
            <Score provider="psp1" type="TXNRISK" value="00032"/>

        Technical Specification Document                               386 | P a g e

<Score provider="psp3" type="TXNRISK" value="00040"/>
</RiskScores>
</Txn>
<Payer addr="PRE@mypsp" name="NOREQREV" seqNum="1" type="PERSON" code="00000">
<Info>
<Identity type="PAN" verifiedName="Ram" id="SDF45645BJB22"/>
<Rating verifiedAddress="TRUE"></Rating>
</Info>
<Device>
<Tag name="MOBILE" value="99345670011"/>
<Tag name="TYPE" value="MOB"/>
<Tag name="ID" value="000000000000002"/>
<Tag name="OS" value="android"/>
<Tag name="APP" value="org.npci.upi.maggi"/>
</Device>
<Ac addrType="ACCOUNT">
<Detail name="IFSC" value="AABY0000382"/>
<Detail name="ACTYPE" value="SAVINGS"/>
<Detail name="ACNUM" value="3453454385"/>
</Ac>
<Creds>
<Cred type="PreApproved" subType="NA">
<Data code="NPCI" ki="20150822">MDB8MTIzNDU2</Data>
</Cred>
</Creds>
<Amount value="1.00" curr="NAD"/>
</Payer>
<Payees>
<Payee addr="2678892001829@AABY0000382.ifsc.npci" name="SonySuper" seqNum="1" code="0000"
cmId="">
<Amount value="1.00" curr="NAD"/>
</Payee>
</Payees>
</ReqPay>

        Technical Specification Document                               387 | P a g e

Ack with Multiple error Code:

<Ack api="ReqPay" reqMsgId="XYD0000000000001GRDpegB9EWpFIHL7Tzs" err="VALIDATION_ERR" ts="2025-08-
21T14:34:39+05:30">
<errorMessages>
<errorCd>R06</errorCd>
<errorDtl>Payer.Code invalid</errorDtl>
</errorMessages>
<errorMessages>
<errorCd>D04</errorCd>
<errorDtl>Payer.Tag.Device.Mobile must be present and valid</errorDtl>
</errorMessages>
</Ack>

6.24.1.2. Duplicate Transaction Id

PayRequest to IPS:

<ReqPay>
    <Head ver="2.0" ts="2025-08-21T14:06:36+05:30" orgId="700001"
msgId="XYD0000000000001GRDpegB9EWpFIHL7Tzs"/>
    <Meta>
        <Tag name="PAYREQSTART" value="2017-12-04T14:15:35+05:30"/>
        <Tag name="PAYREQEND" value="2017-12-04T14:15:35+05:30"/>
    </Meta>
    <Txn id="MYSIM00000005sp4lozf8btWa2V6H0Q" note="REQRESPCRDFAILURE" refId="Ref"
refUrl="https://www.sbi.co.in/" ts="2018-03-02T16:27:44+05:30" type="PAY" custRef="523314499597"
initiationMode="00" purpose="14">
        <RiskScores>
            <Score provider="psp1" type="TXNRISK" value="00032"/>
            <Score provider="psp3" type="TXNRISK" value="00040"/>
        </RiskScores>

        Technical Specification Document                               388 | P a g e

</Txn>
<Payer addr="PRE@mypsp" name="NOREQREV" seqNum="1" type="PERSON" code="0000">
<Info>
<Identity type="PAN" verifiedName="Ram" id="SDF45645BJB22"/>
<Rating verifiedAddress="TRUE"></Rating>
</Info>
<Device>
<Tag name="MOBILE" value="993456700"/>
<Tag name="TYPE" value="MOB"/>
<Tag name="ID" value="000000000000002"/>
<Tag name="OS" value="android"/>
<Tag name="APP" value="org.npci.upi.maggi"/>
</Device>
<Ac addrType="ACCOUNT">
<Detail name="IFSC" value="AABY0000382"/>
<Detail name="ACTYPE" value="SAVINGS"/>
<Detail name="ACNUM" value="3453454385"/>
</Ac>
<Creds>
<Cred type="PreApproved" subType="NA">
<Data code="NPCI" ki="20150822">MDB8MTIzNDU2</Data>
</Cred>
</Creds>
<Amount value="1.00" curr="NAD"/>
</Payer>
<Payees>
<Payee addr="2678892001829@AABY0000382.ifsc.npci" name="SonySuper" seqNum="1" type="PERSON"
code="0000" cmId="">
<Amount value="1.00" curr="NAD"/>
</Payee>
</Payees>
</ReqPay>

        Technical Specification Document                               389 | P a g e

Negative Acknowledgement:

<Ack api="ReqPay" reqMsgId="XYD0000000000001GRDpegB9EWpFIHL7Tzs" err="DUPLICATE_REQ" ts="2025-08-
21T14:06:36+05:30">
<errorMessages>
<errorCd>U01</errorCd>
<errorDtl>The request is duplicate</errorDtl>
</errorMessages>
</Ack>

        Technical Specification Document                               390 | P a g e

==============END OF THE DOCUMENT===============

        Technical Specification Document                               391 | P a g e
