Instant Payments
Namibia

Date: 22 October 2025
Document: INSTANT PAYMENT SOLUTION FUNCTIONAL SPECIFICATIONS
DOCUMENT (FSD) V_10.0

Disclaimer: This document contains confidential information
intended solely for the use of authorised recipients within or
engaged by the Bank of Namibia. Unauthorised disclosure,
copying, distribution, or use of any part of this document is
strictly prohibited. Any person who is not an intended recipient
is hereby notified that any review, dissemination, or reliance on
this document’s content is not permitted. If you have received
this document in error, please notify the Bank of Namibia
immediately and delete all copies of this document from your
records. Immediately and delete all copies of this document
from your records.

Classification: Confidential

1

Table of Contents
PART A: PRELIMINARY ................................................................................................................ 6

1.  REFERENCES AND VERSION HISTORY ................................................................................ 6

1.1.

Version History ................................................................................................................ 6

2.  DOCUMENT REFERENCES .................................................................................................... 9

3.  PURPOSE OF THIS DOCUMENT ........................................................................................... 9

4.  STAKEHOLDER SUMMARY .................................................................................................. 10

4.1. Non-Industry Stakeholder List .................................................................................... 10

4.2.

Industry Stakeholder List ............................................................................................. 11

5.  DEFINITION OF TERMS AND ACRONYMS ........................................................................ 12

5.1. Abbreviations ............................................................................................................... 12

5.2. Definitions ..................................................................................................................... 14

6.  SOLUTION OVERVIEW ......................................................................................................... 18

6.1.

6.2.

Introduction .................................................................................................................. 18

IPS Design Principles ................................................................................................... 19

6.3. Overview of Enabled Use Cases and Channels ....................................................... 20

Enabled use cases: P2P, P2B, G2P, and B2P, merchant cash-out, Merchant cash-

6.4.
in, and ATM cash-out. .............................................................................................................. 21

6.5.

Participation Overview ................................................................................................ 22

6.6. Alias / Handle Overview .............................................................................................. 25

6.7.

6.8.

6.9.

Switching Services........................................................................................................ 26

Fraud and Risk Management ...................................................................................... 27

Supporting Services ..................................................................................................... 27

7.  SCOPE .................................................................................................................................... 28

7.1. Document Scope ......................................................................................................... 28

7.2.

7.3.

Solution Scope ............................................................................................................. 28

Industry Projects to Consider. .................................................................................... 29

PART B: SOLUTION FRAMEWORK ............................................................................................. 30

8.  OVERVIEW OF APPLICATION PROGRAMMING INTERFACES........................................ 30

8.1.

Financial Transactions APIs ......................................................................................... 30

8.2. Non-Financial Transactions APIs ................................................................................ 31

9.  ALIAS / HANDLE MANAGEMENT ....................................................................................... 33

9.1. Alias / Handle Model ................................................................................................... 33

9.2. Alias Registration.......................................................................................................... 35

10. USER REGISTRATION PROCESS ......................................................................................... 37

Classification: Confidential

2

10.1. Device Binding Flow on Mobile Application ............................................................ 37

10.2. Mobile App First Time Registration ........................................................................... 40

10.3. Registering User Store of Value ................................................................................. 48

10.4. Central USSD First Time Registration ........................................................................ 49

10.5. Setting IPS Pin ............................................................................................................... 55

11. ALIAS DIRECTORY ................................................................................................................ 57

11.1. Mobile Number Rules .................................................................................................. 57

11.2. Merchant Unique Code Rules..................................................................................... 58

11.3. General Alias Directory Rules ..................................................................................... 58

11.4. Alias Directory Operations .......................................................................................... 59

11.5. First Time User ID Registration Flow .......................................................................... 60

11.6. Creation of IPS Number as Numeric ID Existing User .............................................. 62

11.7. Deregistration of a Mobile Number ........................................................................... 62

11.8. Deregistration of a Unique Number .......................................................................... 62

11.9. Transfer of Mobile Number between IPS Participants ............................................. 63

11.10. Register to Alias Directory........................................................................................... 64

11.11. ReqValAdd API ............................................................................................................. 66

11.12. Get Address API ........................................................................................................... 67

11.13. IPS Participants Sync .................................................................................................... 69

12. FUNCTIONAL FLOWS .......................................................................................................... 70

12.1. P2P Transactions: Send Money (Mobile App) .......................................................... 70

12.2. USSD P2P Transaction: Send Money ......................................................................... 76

12.3. P2B/M Transactions (Mobile App) ............................................................................. 79

12.4. USSD P2M Transaction: Merchant payment ............................................................. 82

12.5. B/G2P Transactions: Bulk Payment ............................................................................ 85

12.6. Merchant Cash-Out (Mobile App) .............................................................................. 88

12.7. USSD Merchant Cash-out Transaction....................................................................... 91

12.8. Merchant Cash-In (Mobile App) ................................................................................. 94

12.9. USSD Merchant Cash-In Transaction ......................................................................... 96

12.10. ATM Cash-out ............................................................................................................... 99

13. NEGATIVE SCENARIOS ..................................................................................................... 107

13.1. Registration Negative Scenarios .............................................................................. 107

13.2. Transaction Negative Scenarios ............................................................................... 110

13.3. Error Codes ................................................................................................................. 114

14. USER PROFILE MANAGEMENT SERVICES ...................................................................... 115

Classification: Confidential

3

14.1. Set Pin and Changing Pin .......................................................................................... 115

14.2. Balance Enquiry .......................................................................................................... 117

15. DISPUTE MANAGEMENT PROCESS & QUERY MANAGEMENT .................................. 119

15.1. Dispute Management ................................................................................................ 119

15.2. Chargeback ................................................................................................................ 122

15.3. Pre-Arbitration ............................................................................................................ 123

15.4. Arbitration ................................................................................................................... 123

16. FRAUD AND RISK MANAGEMENT .................................................................................. 127

16.1. FRM Capability Overview .......................................................................................... 127

16.2. Purpose and Objectives ............................................................................................ 127

16.3. Rule Configuration and Execution ........................................................................... 128

16.4.

IPS Transaction Flow with eFRM ............................................................................... 129

16.5. Operational Behaviour .............................................................................................. 129

16.6. Configuration of EFRM Rules .................................................................................... 130

PART C: PARTICIPANT ONBOARDING ...................................................................................... 131

17.

INFRASTRUCTURE REQUIREMENTS ................................................................................ 131

18. ONBOARDING AND CERTIFICATION ............................................................................. 132

a.

b.

c.

d.

Participant Onboarding............................................................................................. 132

Certification Phase ..................................................................................................... 132

Certification Process Diagram .................................................................................. 134

Production and Go-live. ............................................................................................ 135

19. HANDLE MANAGEMENT .................................................................................................. 136

19.1. Handle Registration ................................................................................................... 136

19.2. Handle Deregistration, Deactivation, and Reactivation......................................... 139

20. BACK OFFICE AND SETTLEMENT SERVICES ................................................................. 140

20.1. Participant Identification Codes ............................................................................... 140

20.2. Back Office Management .......................................................................................... 141

20.3. Back Office Process flow ........................................................................................... 144

20.4. Settlement Process .................................................................................................... 146

20.5 Pacs.009 File Specifications ...................................................................................... 148

20.6 Settlement Flow .......................................................................................................... 148

20.7 Settlement Times ....................................................................................................... 154

20.8 Settlement Reporting .................................................................................................... 155

20.9 Participant Net Settlement Reports ............................................................................. 155

20.10 Liquidity Management ................................................................................................ 156

Classification: Confidential

4

PART D: IPS PRICING MODEL .................................................................................................. 157

21 PRICING COMPONENTS ................................................................................................... 157

21.1 Onboarding Fee ............................................................................................................ 157

21.2 Participation Fee ............................................................................................................ 157

21.3 Switching Fees and Interchange Rates ........................................................................ 158

21.4 Exiting Fee ...................................................................................................................... 161

21.5 Additional Fees .......................................................................................................... 161

PART E: IPS BUSINESS AND PRODUCT RULES .......................................................................... 161

22

IPS BUSINESS RULES .......................................................................................................... 162

22.1 USSD Rules ................................................................................................................. 162

22.2 . Mobile Application Rules ............................................................................................ 162

22.3 Purpose Codes ............................................................................................................... 163

22.3. Initiation Modes............................................................................................................. 163

22.4. Transaction Limits, Purpose Codes, and Initiation Modes ....................................... 164

23 IPS PRODUCT RULES ............................................................................................................ 168

24 SERVICE LEVEL AGREEMENT ........................................................................................... 168

ANNEXURES ........................................................................................................................... 168

Classification: Confidential

5

PART A: PRELIMINARY

1.  REFERENCES AND VERSION HISTORY

1.1.

Version History

Version

Date

Description

Author

1.0

2.0

3.0

08 November 2024

First version of the FSD to Industry

Bank of Namibia

22 November 2024

Second version with industry input
incorporated (clean)

Bank of Namibia

03 December 2024

• Revised the onboarding and 2 step

Bank of Namibia

verification process.
Included the IPS pricing model.

•
• Clarified

central

USSD

functionality.

• Revised ATM cash-out flow
•

Included the dispute management
and charge back process.
Included business rules for USSD,
and mobile applications

•

4.0

09 December 2024

5.0

13 December 2024

6.0

16 January

• Fixed ATM withdrawal rule (no
predefining and blocking funds at
OTP generation stage)
• NPCI input incorporated.

Bank of Namibia

• 2 stage verification flow revised.
• Clarification of transaction limits
• Gramma fixes

Bank of Namibia
and NPCI

• 2 stage verification revised
• Settlement
reconciliation

files

NPCI

added in excel doc on page 126

7.0

8.0

26 February 2025

• ATM

cash withdrawal

flow

Bank of Namibia

updated

23 April 2025

• ReqValAdd API flow revised.
• Bulk payment flow included
• Purpose

codes and

initiation

Bank of Namibia

modes included.

• Reference to

ID numbers

for

Government payments removed

Classification: Confidential

6

Version

Date

Description

Author

8.1

10 June 2025

• MNO Verification flows revised
• USSD registration flow revised
• Clearing and settlement process

revised.

• Section 10.3. Enhanced two- stage
verification on mobile application
wording.

• Section 10.4. Enhanced first time
registration through Central USSD
wording

• Section 11.11. Cleaned up
ReqValAdd API table.

• Section 12.4. Enhanced B/G2P
Transactions: Bulk Payment rules.

Instant Payments
Namibia

9.0

31 July 2025

• Section 10:3 Updated verification
flow and removed OTP from MNO

• Section 10.4 Added USSD

Instant Payments
Namibia
and
NPCI

onboarding using mobile wallet
Pin

• Section 10.5 Added Mobile APP
Onboarding using Mobile Wallet
PIN , Debit card and National ID
• Section 11.1 Update MNO Logic in

Mobile number rules

• Section 11.2 Updated Merchant

code rule

• Removed mapper.ipn from the FSD
• Section 20.5. Added Pacs.009 File

•

Specifications
Section 20.6 Added settlement
flows (including the exception
handling in 20.6.1 -20.6.3

• Reference to enabler in payment
flows removed throughout the
document

• Section 10.3 and 10.4 Amended
the User onboarding flows for both
USSD and Mobile Application to
reflect the steps for linking of the
mobile number to the long handle.
Included Merchant cash in in the
use cases.

•

Instant Payments
Namibia
and
NPCI

10.0

22 October 2025

Classification: Confidential

7

Version

Date

Description

Author

• Section 11.1 Updated the MNO
logic to make provision when a
new MNO is onboarded

• Section 12.2 Removed payment via

Account + IFSC.

• Section 12.3 Updated the MMID

from 7 digits to 8 digits

• Section 12.6 Amended Merchant
incorporate

cash
additions in the product rules.

inflow

to

• Amended

16

EFRM
section
capability and overview and added
more detail regarding the EFRM
Solution.

• Section 20.3.3 Added an additional
point to the existing back-office
process flow steps.

• Section 20.6.1 pacs.009

flow

updated

• USSD Rules: amended the rules
across to include Merchant cash in
• Section 10:4 Added General Rules
covering SPV alias allocation, alias
creation before SoV selection, and
use of mobile number for USSD
transactions.

• Amended settlement windows in

section 20.

• Added Section 21.6 IPS Fee and

Interchange structure

• Amended section 22 Transaction

limits, purpose codes and
initiation mode

Table 1: Version history

Classification: Confidential

8

2. DOCUMENT REFERENCES

The following documents were referenced in the formulation of this functional specification

document:

Title

Bank of Namibia Open Banking Position Paper

Bank of Namibia Quick Response Code Guidance Note

Bank of Namibia Solution Design Document Version 0.2

Determination for the Authorisation of Payment System Operators and System
Participants in the National Payment System

Determination on Card Interchange and ATM Surcharging

Determination on the Issuance of Electronic Money in Namibia

Namclear New Services Functional Specification V6.0

Payment System Management Act 14 of 2023

Abbreviation

BON OB

BON QR Code

SDD

PSD-6

PSD-11

PSD-3

Namclear SFS

PSM Act

Instant Payments Namibia Product Rules v.0.9

IPN Product Rules

Instant Payment Solution Technical Specifications v.0.6

IPS TSD

Table 2: Document references

3.  PURPOSE OF THIS DOCUMENT

This document sets out to cover the functional requirements specifications (FRS) pertaining to

the Instant Payment Solution (IPS). The purpose of the FRS is to define the functional scope by

clearly outlining the functional capabilities, features, and use cases of the IPS. The target

audience of this document are the prospective IPS participants (IPSPs) who have obtained the

necessary approvals to participate on the IPS as well as the NPCI International Payments Limited

(NIPL) who is the solutions and technology partner. This document will be used by the IPSPs to

create user journeys, onboard IPS users onto the IPS switch and develop the functional

specifications of the IPS use cases for go-live. It will be a living document that will be updated as

additional use cases and functional flows are created. The technical specifications will be

Classification: Confidential

9

addressed in a separate document which will be referred to as the Technical Specification

Document (TSD).

4.  STAKEHOLDER SUMMARY

4.1.

Non-Industry Stakeholder List

No

Stakeholders

Bank of Namibia (BoN)

Type

Solution Owner

1

2

3

4

5

6

7

8

9

10

11

Communications Regulatory Authority of Namibia
(CRAN)

Communications Regulator

Instant Payments Namibia (IPN)

Fintech – Solution Operator

Ministry of Finance and Public Enterprises

Government Ministry

Ministry of Gender Equality, Poverty Eradication and
Social Welfare

Government Ministry

Namibia Financial Institutions Supervisory Authority
(NAMFISA)

NBFI (Non-payment) Regulatory

Namibia Revenue Authority (NAMRA)

Revenue Authority

National Payment System and Financial Surveillance
Department

Regulator

NPCI International Payments Limited

Solutions and Technology Partner

Payments Association of Namibia

Industry Body

PWC Advisory Services

Project Manager

Table 3: Non-industry stakeholder list

Classification: Confidential

10

4.2.

Industry Stakeholder List

No

Stakeholders

Type

1

2

3

4

5

6

6

7

8

9

Adumo

ATM Solutions

Banco Atlantico\*

Bank BIC\*

Bank Windhoek

Buddy Industries\*

Collexia

Third Party Payment Service Provider (Enabler)

Third Party Payment Service Provider (Enabler)

Bank (SOV Provider)

Bank (SOV Provider)

Bank (SOV Provider)

Third Party Payment Service Provider (Enabler)

Payment Facilitator (Enabler)

Currency Management
Operations (Bank of Namibia)

and

Banking

Banker to Government (IPS Participant)

EasyPay\*

Ecentric Switch

Third Party Payment Service Provider (Enabler)

Third Party Payment Service Provider (Enabler)

10

First National Bank

Bank (SOV Provider)

11

Hyphen\*

12

Innervations

Third Party Payment Service Provider (Enabler)

Third Party Payment Service Provider (Enabler)

13

Letshego Bank

Bank (SOV Provider)

14 MobiCash

Third Party Payment Service Provider (Enabler)

15

Nam-mic Payment Solution

E-money Issuer (SOV Provider)

16

Namclear

17

Nampost

Payment System Operator (ACH)

Payment Instrument Issuer (SOV Provider)

18

Nedbank Namibia

Bank (SOV Provider)

19

Nutun Transact\*

Third Party Payment Service Provider (Enabler)

20

Payat\*

21

PayMate

Payment Facilitator (Enabler)

Payment Facilitator (Enabler)

Classification: Confidential

11

No

Stakeholders

Type

22

RealPay

23

Selcom

Payment Facilitator (Enabler)

Payment Facilitator (Enabler)

24

Standard Bank of Namibia

Bank (SOV Provider)

25

Virtual Card Service – DPO

TPPP & Payment Facilitator (Enabler)

26

Virtual Technology Services

E-money Issuer (SOV Provider)

27

Vivo Energy\*

28 MTC Maris

Table 4: Industry stakeholder list

E-money Issuer (SOV Provider)

E-money Issuer (SOV Provider)

Note: \* Did not form part of the Solution Design Sessions

5.  DEFINITION OF TERMS AND ACRONYMS

5.1.

Abbreviations

Abbreviation / Acronym

Description

2-FA

ACH

AML

APP

API

ATM

B2G

CL

FIC

FRM

G2P

Two-factor authentication

Automated Clearing House

Anti-Money Laundering

Application

Application Programming Interface

Automated Teller Machine

Business-to-Government

Common Library

Financial Intelligence Centre

Fraud Risk Management

Government-to-Person

Classification: Confidential

12

Abbreviation / Acronym

Description

IFSC

IPP

IPS

IPSP

IPN

ISO

MNO

NISS

NPCI

NIPL

OTP

PCH

P2P

P2B/G

PIN

POS

PSP

QR

QDMS

RDS

SDK

SLA

SoV

SPV

Indian Financial System Code

Instant Payment Programme

Instant Payments Solution

Instant Payment Solution Participant

Instant Payment Namibia

International Standards Organisation

Mobile Network Operator

Namibia Interbank Settlement System

National Payment Corporation of India

NPCI International Payment Limited

One Time Pin

Payment Clearing House

Person-to-Person

Person-to-Business, Person-to-Government

Personal Identification Number

Point of Sale

Payment Service Provider

Quick Response

The Query and Dispute Management System is a service that will be
provided by the Instant Payment Switch Operator to be used by the
Instant Payment Switch Participants, in raising disputes or queries
related to the instant payment transactions, on behalf of their
customers.

Recommendations

Software Development Kit

Service Level Agreement

Store of Value

Special Purpose Vehicle

Classification: Confidential

13

Abbreviation / Acronym

Description

SPOC

SWIFT

TATs

T+1

USSD

IRCS

Single Point of Contact

Society for Worldwide Interbank Financial Telecommunications

Turnaround times

Transaction date plus one business day

Unstructured Supplementary Service Data

IPS Real Time Clearing and Settlement

Table 5: Abbreviations

5.2.

Definitions

Term

Description

Action date

The date on which the transaction is to be actioned and settled. This is also
referred to as Day 1.

Alias or Handle

A unique identifier that substitutes an individual or a merchant’s store of
value details. The alias / handle is used to identify the user during a financial
or nonfinancial transaction on the instant payment switch.

Alias directory

A digital registry that maps the full form alias version of the user with his/her
mobile number, and a merchant with its unique number.

Beneficiary

Charge back

Clearing (clear)

A customer or merchant who receives money through the instant payment
switch. Beneficiary’s store of value is credited as part of the payment
transaction.

A charge that is returned after a customer successfully disputes an item on
an already completed transaction with his/her Store of Value (SoV).

The process of transmitting, reconciling and, in some cases, confirming
payment orders prior to settlement and possibly including the netting of
instructions and the establishment of final positions for settlement. This is a
back-office function by the Instant Payment Switch Operator.

Clearing cycle

The timeframe within a single business day which the settlement obligations
are calculated.

Creditor

Refers to the beneficiary who receives the instant credit transfer.

Classification: Confidential

14

Term

Description

Customer

Daily Transaction
Maximum Limit

Debtor

Deemed

Dispute

Electronic money
money)

(e-

Enabler

Full form alias or Handle

Refers to a payer, or payer in an instant payment transaction. Customer is
interchangeably with user, debtor, creditor, remitter, or
also used
beneficiary.

The total amount a user is allowed to transact within a particular day.

The remitter (person or merchant) that initiates a credit transfer instruction
and whose store of value is debited as a result.

In an event where the status of the transaction (success or failure) is not
determined at the instant payment switch, the transaction is marked with a
“Deemed” status. Such transactions are reconciled manually during the
settlement process.

A disputed transaction refers to a situation where a customer disputes a
charge on their store of value. This could be on account of possible fraudulent
or unauthorised transactions. A dispute is usually raised by the originator of
the transaction.

Means monetary value as represented by a claim on its issuer, that is:

a) Stored electronically,
b) Issued on receipt of funds,
c) Accepted as a means of payment by persons other than the issuer,

and.

d) Redeemable upon demand for cash in Namibian Dollar.

A non-bank payment service provider that is not authorised to provide a
store of value but is authorised to be an indirect participant on the instant
payment switch. The enabler may also be contracted by an instant payment
participant to onboard new instant payment user, or simply provide instant
payment use case services on mobile application.

A payment address of the individual or merchant in an abstract form that
identifies store of value details in a normalised notation. A full form alias or
handle appears before the IPSP’s identifier of the store of value provider and
can be in the form of fullformalias@IPSP.

Good standing

A state of the user’s store of value that shows no derogatory status that will
inhibit the sending and receiving of funds.

Participant identifier

An identifier given to an instant payment solution (IPSP) participant which is
used to identify transactions emanating from or being routed to the IPSP. The
handle is preceded by the at symbol (@), for example, @IPSP.

Classification: Confidential

15

Term

Description

Instant Payment
Namibia

The Special Purpose Vehicle entity with company registration 21/2024/1112,
authorised to operate the Instant Payment Solution.

Instant Payment
Solution participant
(IPSP)

A bank or non-bank that connect directly to the IPS switch, onboards,
registers, and authenticates new customers, creates an IPS full form alias,
does the device binding and support IPS PIN creation. The IPSP provide
payment (credit / debit) services to users. IPSPs provide IPS customers with
an option to choose any store of value provider available on the IPS to link to
a full form Alias. The IPSP need not be the remitter bank or beneficiary bank
but can be both.

Instant Payment Switch
(Solution)

The central payment and clearing system operated by Instant Payments
Namibia to facilitate the real-time processing and routing of instant payment
transactions between instant payment switch participants.

Instant payment
transaction

Refers to a payment process where funds are transferred from the payer to
the payee in real-time, with immediate confirmation of the transaction's
success or failure. The transaction happens within a few seconds, allowing
the recipient to access and use the funds almost instantly.

Interchange

Refers to the fee or compensation that one IPSP pays to another when
facilitating an instant payment transaction.

Inward Clearing

The process which sorts and bundles instant payment transactions received
from other participants via the instant payment switch, and which must be
paid by the receiving participant to the store of value provider.

Originator

The person or merchant that issues an instant payment instruction.

Outward clearing

The process which sorts and bundles instant payment transactions received
from a particular IPSP’s customer, and which must be paid by another IPS
participant, including the capture of associated payment data.

Payee IPSP

Payer IPSP

An entity that onboards the customer, creates an IPS full form alias, performs
device binding (first factor of authentication), and support IPS PIN creation.
Essentially, the payee IPS participant holds the payee information to process
the transaction over IPS. The payee IPS participant may not always be the
beneficiary store of value provider.

An entity that onboards the customer, creates an IPS full form alias, performs
device binding (first factor of authentication), and support IPS PIN creation.
Essentially, the payer IPS participant holds the payer information to process
/ receive the transaction over IPS. The payer IPS participant may not always
be the remitter store of value provider.

Classification: Confidential

16

Term

Description

Remitter

Refund

Restful API services

Reversal

Settlement

Payer Store of Value Provider. Responsible to issue and store the IPS PIN set
by the user, checks / validates and approve balance.

A refund is raised against a transaction that is successfully completed. It is a
process where the transaction amount is given back to the customer when a
customer successfully disputes the amount, product or service which does
not meet expectations. This is typically applicable for person to business
payments and payments performed offline.

IPS uses the Restful services where asynchronized communication is carried
out using XML schema over HTTPS protocol. This includes the parameters
needed, how data is requested, the structure of the data produced and any
error messages to be displayed if rules are not correctly observed. The Restful
services will be referenced by the service provider to ensure that the data
request is valid. The IPS services will have an acknowledgement and a
response for a very request done through the APIs.

Reversal is initiated when either a beneficiary store of value provider is not
available, or a decline is received from the beneficiary store of value provider
in an online message. It is a term that describes the transaction that is
returned to a payer’s store of value provider.

The process of crediting or debit net positions between store of value
providers in Real-Time Gross Settlement System (NISS).

form alias or

Short
handle

A mobile number for individuals and an 8-digit unique number for merchants
which are linked (mapped) to the full form alias of the users, which are stored
in the alias director together with the full form alias.

Store of Value

Means a bank account or electronic wallet provided by a banking institution
or a non-banking payment instrument issuer licensed by the Bank of Namibia
in terms of the Payment System Management Act 14 of 2023.

Means a banking institution or a non-banking payment instrument issuer
licensed by the Bank of Namibia in terms of the Payment System
Management Act 14 of 2023. The store of value provider is authorised to
participate directly on the instant payment switch. The store of value
provider can choose to either be or not be an IPS participant.

The number of times a user can perform a transaction within a particular day,
regardless of the Daily Transaction Maximum Limit.

Store of Value Provider

Transaction Frequency
per Daily Transaction
Limit

Table 6: Definitions

Classification: Confidential

17

6. SOLUTION OVERVIEW

6.1.

Introduction

This document has been prepared to articulate the Instant Payment Solution’s (IPS) functional

specifications. This document is the result of multiple Design Phase Focus Group Discussions

involving representatives from the industry. Its primary aim is to disclose the functionality of the

IPS being introduced by the Bank of Namibia (the Bank) and co-created by the industry

participants. The

IPS

intends to

introduce fast payments, achieve e-money wallets

interoperability with bank accounts, and introduce use cases and functionalities that will enhance

financial inclusion, specifically in the rural areas and the informal sector of Namibia.

The solution being introduced is a payment and clearing switch that enables both banking

institutions and non-banking financial institutions to provide instant payment services in a

multidimensional payment ecosystem. The IPS is API-based, which will enable IPSPs to seamlessly

interface various payment applications such as mobile applications, USSD, internet banking, and

QR code payments, among others. The IPS is compatible with both e-money wallets and bank

accounts as SOVs for customers. The IPS allows for interoperability across payment channels,

devices, and institutions for inclusive participation (see Figure 1). It also allows interoperability

between multiple identifiers such as mobile numbers and unique aliases / handles for both

individuals and merchants.

Classification: Confidential

18

Figure 1: Instant Payment Platform Overview

6.2.

IPS Design Principles

During design phase, five (5) design principles were formulated to be the north star for cocreating

the IPS. These principles were taken from the lens of the consumer and are as follows:

No

Principle

Description

1

2

3

4

5

Affordable

Easy to use

Deliver a payment solution that is affordable for lower income
consumers

Provide an intuitive payment alternative to cash, one that is inclusive of
all consumer segments

Interoperable
agnostic

&

A system that is compatible with various devices, channels and
platforms addressing different needs of the consumer.

Accessible and always
on

An interface that is convenient and always available

Secure payments

The safety features of the platform allow consumers to be protected and
ensures safety of transactions

Table 7: Design principles

Classification: Confidential

19

6.3.

Overview of Enabled Use Cases and Channels

The following use-cases, features and channels have been approved for go-live and phase 1 of

the IPS rollout. All IPSPs should be in a position to provide all seven (7) use cases. The list is not

exhaustive but has been limited for go-live with additional use cases to be added post go-live.

Uses cases User type

Features

Channels

Alias

P2P

Individual
customer
and sole
trader

P2B/M

Individual
customer to
merchant

• Send money.
• Receive
money.
• Preapproved
authorised
payments

• Pay merchant

• Central USSD
• Mobile App
•
Internet
banking (up to
the participant)

• 15–20-character full form

alias:
(john123@sovprovider)
• 9-digit short form alias:
841235684 (linked to full
form alias)

• Central USSD
• Mobile App
•
Internet
banking (up to
the participant)
and
QR

• Static

Dynamic
Code

Payment to
• merchant full form alias of

15-20 characters:
merchant123@sovprovider
• merchant short form alias:
8-digit unique number
mapped to full form

• Bulk payments from IPN
handle: account-no@ifsc-
code.ifsc.npci

• Note: These will be Pre-

Auth transactions

• Bulk payments from IPN
handle: account-no@ifsc-
code.ifsc.npci

• Note: These will be Pre-
Auth transactions

•

Individual short form alias,
long form alias or QR code.

G2P

Government
agencies to
person

B2P

Business to
person

• Bank

of

Namibia
(CMBO)

• Business

• Government
pension
and
grants through
Bank
of
Namibia

• Preauthorised
business
payments (one
to many)

Cash in at
merchant

Individual
customer
cash in at
merchant

• Merchant pays
as
merchant
P2P

• Mobile app
• QR Code
• Central USSD

Cash-out at
merchant

Individual
customer

• Cash-out by
scanning

• Mobile App
• Central USSD

• Merchant QR code
• Merchant unique code

Classification: Confidential

20

Uses cases User type

Features

Channels

Alias

cash-out
merchant

at

merchant QR
code

• Cash-out by
inserting
merchant
unique code in
USSD menu

ATM
withdrawal

•

Individual
customer
withdrawal
at ATM

Individual
withdrawal
from ATM
using short
form alias
(mobile
number) and
OTP

Table 8: IPS use cases overview.

• ATM
• Central USSD

form

Short
number)

alias

(mobile

The IPS will use proprietary IPS QR code specifications until such a time QR code specification are

standardised in Namibia. These will be shared with the participants along with the Technical

Specification Document (TSD). Once standardised, the IPS Operator will ensure that IPS QR code

specifications align to the national QR code standards.

6.4.

Enabled use cases: P2P, P2B, G2P, and B2P, merchant cash-out,

Merchant cash-in, and ATM cash-out.

When the solution goes live in September 2025, seven (7) use cases are envisaged to be enabled.

These use cases are P2P, P2B/M, G2P, B2P, merchant cash-in, merchant cash-out and ATM

withdrawals which are all significant and relevant to immediately enhancing financial inclusion

and securing adoption from the public. P2P refers to person to person instant payments in an

interoperable ecosystem. P2P also includes payments to sole traders that will be identified under

separately for processing purposes. P2B refers to person to business / merchant payments.

Merchants are assigned merchant aliases to also identify them for various reasons, i.e., tax, BIPA

requirements etc. G2P refers to Government / Public Enterprises to Person payments while B2P

refers to Business to Person payments. G2P and B2P will have similar flows wherein either the

Classification: Confidential

21

government agency or a merchant will be assigned a merchant ID to enable one to many

preauthorised payments. The technical message payloads contain the necessary fields (payment

messages have the necessary data fields) to enable both retail and business payments. Merchant

initiate transactions using customised names, which are conditional on certain rules. This is to

cater for concerns regarding fraud such as impersonation fraud, where someone would use a

customized name identifier that would impersonate a business. Merchant cash-in allows

individuals to fund their own store of value, in person at a merchant while merchant cash-out

allows individuals to withdraw funds from their store of value, in person at the merchant. ATM

cash out will allow for store of values to cash out at any IPS enabled ATM providing

interoperability.

All IPS use cases will allow for on-us processing by IPS Participants. Where both the payer and

payee are customers of the same IPSP, the transaction shall be processed internally by the IPSP

but must still be logged at the IPS switch for settlement, reconciliation and reporting purposes.

6.5.

Participation Overview

The payment service provider (PSP) landscape consists of several payment players, organized

according to 2 main categories; Banks and Non-banking financial institutions (NBFIs). The NBFI

category is further demarcated into 4 categories namely payment instrument issuers (PIIs),

payment facilitators (PFs), third party payment providers (TPPPs) and virtual asset service

providers (VASPs). For the purposes of this document, VASPs are out of scope. With regards to

Store of Value (SoV) Providers, only banks and payment instrument issuers are authorised to

provide customers with store of value i.e., bank accounts and e-money wallets. In the card and

EFT stream, only banks are direct participants now with one non-bank. The law however allows

for payment instrument issuers to directly participate in both card and EFT, if they have the

capability and the necessary approvals. PFs and TPPPs cannot directly participate in the card and

EFT streams but provide auxiliary services to clients such as banks (gateways, switching) and

merchants (mainly debit order services). Currently both banks and payment instrument issuers

provide e-money wallets as store of value. PFs and TPPPs may not provide e-money wallets unless

Classification: Confidential

22

they are authorised as payment instrument issuers (PIIs). As such on the IPS, only banks and PIIs

will be considered as SoV providers while PFs and TPPs, also referred to as Enablers can provide

auxiliary services such as mobile applications and integration services for go-live. This position

will be revisited after go-live once security measures and open banking measures have been

introduced to protect store of value providers and their customer's information. A participant

that provides both store of values and acquires merchants or individual customers on the IPS will

be referred to as an IPSP. Note that it is possible for a participant be onboarded only as a store

of value provider or only as an IPSP that does not provider store of values.

Figure 2: Payment Service Provider (PSP) landscape

Participation within the Instant Payment Solution (IPS) will be determined by both Regulation

and the rules of the IPS Operator. Using the existing Nambian payment ecosystem, the current

licensing regime is used to determine the level of participation in the IPS environment. The

Payment System Management Act 14 of 2023 allows for payment system operators and payment

service providers to operate payment systems and provide payment services in Namibia. In this

regard, the IPS Operator is regarded as the payment system operator and is allowed to have

system participants. For purposes of IPS switch, only participants that send and receive

Classification: Confidential

23

instructions related to sending and receive instant payments to the IPS switch will be regarded

as IPSPs. Store of value providers only receive instructions to either credit or debit a store of value

and respond to the IPS switch with confirmation. While there is a difference in the roles of an IPS

participant and a store of value provider, both roles can be executed by the same entity

depending on the transaction and whether there is an Enabler involved. An Enabler will not be

considered as an IPS participant or a store of value provider. An enabler may provide a mobile

application and partner with an IPSPs to provide instant payment services.

Figure 3: Payment Service Provider (PSP) payment streams

In terms of participation on the IPS, both banks and payment instrument issuer store of values

will be enabled. Store of value providers will play both the role of store of value provider for their

clients as well as an IPSPs for both their clients and enablers. This means that store of value

providers can be referred to as IPSPs while enablers (PFs and TPPPs) will be allowed to provide

payment services through their mobile applications and through partnership arrangements with

an IPSPs. This therefore means that enablers will not qualify for an IPS handle but may onboard

customer by assigning handles issued by the IPSP or the store of value providers onto their mobile

applications client facing channels. The limitations of enablers to directly participate as IPSPs is

dependent on them acquiring a payment instrument issuer license.

Classification: Confidential

24

Figure 4: IPS Switch enablers

6.6.

Alias / Handle Overview

IPS users will be required to have an alias (the term handle will be used interchangeably with

alias in this document and accompanying documents such as the Product Rules and Operational

Rules) that enables them to access and transact on the IPS. This is to provide a standardised

experience for the users, enablers, IPSPs and store of value providers without relying on the

conventional account numbers or mobile money wallet identifiers. Only a store of value provider

or an IPSP will be able to provide a user with a full form alias. This full form alias construct can

then be linked to the customer’s store of value of choice. For convenience, a user can link their

mobile number to their full form alias and only provide the mobile number to anyone who wants

to send money to them. For a merchant, a full form construct will also be provided which can be

linked to a unique number that a merchant can expose to a buyer. The merchant unique number

can also be used to pay a merchant using USSD which reduces the need to enter a full form alias

in the USSD menu. Given the setup of the solution, a mobile number can only be used as a short

form alias meaning it cannot be included in the full form alias construct. This is to avoid challenges

and limitation associated to mobile numbers as they can be recycled, and users also have multiple

bank accounts within a particular institution and across various institutions.

Classification: Confidential

25

From a merchant perspective, only sole traders can use mobile numbers to receive payments

which will still be identified as a P2P transaction. However, sole trader will be categorised with a

standard MCC, for further identification in reporting/settlements. For bigger merchants, a

customised name will be provided for making and receiving payments. The customised name

must be related to the business and can only be

in a full form for example as

TheFoodStore@IPSPhandle.

6.7.

Switching Services

The IPS solution will accommodate 2 stores of value (SOVs) namely a bank account or an e-money

wallet. The type of bank accounts to be enabled at go-live include current accounts, basic bank

accounts and savings accounts. E-money wallets from both banks and non-banks will also be

enabled. The IPS will perform switching and routing services for instant payment transactions

between bank accounts and e-money wallets. The IPS operator will provide participants with

access management controls for their respective organisations to access the back-office portal

for various services such as reconciliation, raising deputes, credit adjustments and accessing

various reports such as raw data files and NTSL reports. Whether the IPS Switch is triggered from

a bank account or wallet, the clearing message will carry a mandatory unique store of value

reference of the beneficiary in the form of the full form alias (AliasIdentifier@handle) routed

through the alias directory.

In terms of channel access, IPS users will be able to access instant payment services through

mobile applications of IPS participants or Enablers, a central USSD menu provided by the IPS

Operator or through internet banking channels of the banks. Both static and dynamic

interoperable QR codes will also be exposed by both individuals and merchants to receive

payment.

Classification: Confidential

26

6.8.

Fraud and Risk Management

From a fraud and risk management perspective, central fraud management capabilities will focus

on surveillance, monitoring, notifications, and fraud prevention. The IPS Operator will monitor –

at the systems level – for any suspicious activities that match predefined patterns such as

multiple same value transactions during unusual hours and notify participants for further action.

Participants may manually request a limited number of customised rules. This capability will be

automated for a greater number of rules. Case management capabilities include viewing the

notifications with details, along with search filtering and capability for participants to provide

feedback on FRM. Fraud score injection for every identified case, based on the transaction

outcome. For fraud score injection, the FRM system will inject a fraud score into the transaction

message, based on machine learning algorithms and several configurable input parameters. The

FRM rules will be provided in a separate document.

6.9.

Supporting Services

The IPS Operator will provide supporting services for IPS participants which includes a self-service

portal, 24-hour helpdesk, query management, SLA management and reporting for the central IPS

switch. IPS supporting services will leverage current services such as the service desk and

automated query management processes. IPS participants may enhance these capabilities for

future iterations of the IPS.

Classification: Confidential

27

7. SCOPE

7.1.

Document Scope

This document strictly covers the functional requirements pertaining to the Instant Payment

Solution. The functionalities and use cases covered herein are for go-live, with additions and

modifications envisaged after go-live. All out-of-scope use cases and functionalities will be

activated after go-live, with their functional and technical specifications to be defined post-

launch. This document will be updated with new functionalities and use cases as they are

developed by the IPS Operator. The technical requirements are not covered in this document and

will be provided for in the Instant Payment Technical Specification Document.

7.2.

Solution Scope

Function / Service

In Scope for Go-live

Out of Scope for Go-live

Use cases

P2P, P2B, G2P, B2P, Merchant

P2G, B2G, B2B

cash-in and cash-out, ATM cash-

out

Features

Send money.

Request to pay.

Make a payment / pay a bill.

Mandate payments

Cash-out at Merchant and ATM

Cross-border payments

Cash-in at Merchant

Bulk payments

Static QR payments

Dynamic QR payments

Identifier

Mobile number

Company registration

Customised name

Unique Token

Other identifiers

Construct

Full form alias construct

Account number

Short form alias construct

Classification: Confidential

28

Function / Service

In Scope for Go-live

Out of Scope for Go-live

Services

Alias and handle registration

Alias and handle deregistration

SOV

Current account

Savings account

Prepaid cards

Unit trust accounts

Basic bank account

Investment accounts

Electronic money wallet

Vouchers

Channels

Participant mobile applications

Central mobile application

Issuer mobile application

Participant USSD

Internet banking

Universal USSD

ATMs

Table 9: Solution scope

7.3.

Industry Projects to Consider.

This document acknowledges that there are other ongoing projects that may impact or are

complementary to the successful implementation of the IPS. Some projects are directly impactful

while others are indirectly impactful meaning that they are industry projects that can derail the

IPP given resources constrains at industry level:

a) NISS Version Upgrade

b) NISS ISO Migration Project

c) Open Banking Project

d) QR Code Standard Specifications

e) Interchange Project

f) CMA cross-border low value payments migration to SADC-RTGS

Classification: Confidential

29

PART B: SOLUTION FRAMEWORK

8.  OVERVIEW OF APPLICATION PROGRAMMING INTERFACES

This section provides an overview of the various APIs that are made available on the IPS. The

available APIs are for both financial transactions and non-financial transactions (Meta). Financial

APIs are used to complete the debit and credit transactions between the remitter and beneficiary

store of value providers. The success code for an API call to is always 00. In terms of error codes,

a separate document referenced under section 13 provides the various error messages.

8.1.

Financial Transactions APIs

The following tables provides information about the following APIs that are supported by IPS for

financial transactions. Every API shall have the request and response in a predefined format.

API

Description

Request Pay
Details

This is the primary API that is used by the IPS participants to initiate the
payment request to the IPS Switch. This API is used for sending back the
response of financial transactions that are initiated through the ReqPay API to
the IPS participants. The different kinds of ReqPay APIs are specified in the TSD
as they may be applicable.

Request
Authentication Details

This API is used to authorize a payment and translate IPS participants’ specific
payment addresses to any of the common global addresses of the customer,
such as account number that the IPS can understand. Following is the request
format of the Request Authentication Details API.

Table 10: Financial transactions API summary detail

Classification: Confidential

30

8.2.

Non-Financial Transactions APIs

Meta APIs are used to complete the IPS based transactions through the automation process in

real time. This table provides information about the non-financial transaction APIs that are used

to validate accounts during customer on boarding, address sending and receiving money, and

provides phishing using whitelisting APIs.

API

Description

List PSP

List Account Providers

List Keys

List Verified Addresses

List Account

The IPS Operator maintains a list of all registered IPS participants and
their details. This API allows IPS participants to request the list of all
registered IPS participants for local caching. The data is used to validate
the payment address before initiating any instant payment transaction.

This API allows IPS participants to get a list of all stores of value providers
who are connected by using the IPS. IPS participants maintain the list for
registered store of value providers before registering a customer store
of value within their application.

The IPS Operator maintains a list of all public keys for encryption
purposes. This API allows IPS participants to request and cache the list of
public keys of the IPS Operator. The IPS Operator provides the trusted
and certified libraries that IPS participant use for credential capture and
PKI public key encryption at the time of capture.

This API allows IPS participants to request a list of verified address entries
to protect customers from attempts to spoof well-known merchants,
such as e-commerce players, mobile network operators, and bill
payment entities.

This API allows IPS participants to find a list of accounts that are linked to
the mobile number by a particular store of value provider. As part of the
ATM PIN introduction, the remitter store of value provider responds with
a new cred block with subtype as ATM PIN, its type and length, where
PIN length can be 4 or 6 digits. This information is used to capture ATM
PIN in the common library.

Manage Verified Address
Entities

This API allows IPS participants to manage and access the common
collection of verified address entries.

Validate Address

This API allows IPS participants to validate the beneficiary address when
the customer wants to add a beneficiary within the IPS participant’s
application to send or collect money.

Classification: Confidential

31

API

Description

Set Credentials

This API is required to provide a unified channel for setting and changing
the IPS PIN across various store of value providers. This feature is critical
as customers can easily change the IPS PIN by using the mobile.

Mobile Banking Registration This API allows the new and existing customers to set a new IPS PIN

Check Transaction Status

This API allows IPS Operator to request for the status of the IPS
transaction. The IPS switch can request for the transaction status only
after the specified timeout period.

OTP Request

This API allows IPS participants to request an OTP for a specific customer
from a remitter.

Balance Enquiry

This API allows IPS participants to enquire the account balance of a user.

Heartbeat request

This API monitors the IPS system, checks the connection with IPS
participants.

Transaction Confirmation

This API allows PSPs to confirm the status of the IPS transaction.

Reset credentials

An API to invoke the common library when the user wants to reset their
PIN.

Get Address

This API shall be used for checking the availability of an ID before creating
a new record as well as for fetching status in case of timeout of
CREATE/MODIFY/DELETE record.

Register Alias Directory

This API will facilitate IPS Mobile Applications to Register/Modify user IDs
at the alias directory. Using this API user can create the user ID more than
once and can be linked to an active full form alias.

Alias Directory
Confirmation

Alias Directory will send the
notification of Porting of Mobile Number to old PSP.

Table 1: Non-financial transactions API summary detail

Classification: Confidential

32

9. ALIAS / HANDLE MANAGEMENT

9.1.

Alias / Handle Model

Instant payment transactions involve the movement of funds through bank accounts and e-

money wallets in an interoperable setup. During the transaction, a user will not be required to

share his/her account or wallet details but instead only share a virtual payment addresses which

is referred to as an alias or handle. An alias is simply a handle of the user that is used to identify

the store of value details of the user at the user’s store of value provider. Instead of providing

account details or wallet information, the user simply provides a full form or short form alias to

make or receive payments regardless of the type of store of value or provider.

Figure 5: Individual aliase model

A long form alias will comprise of a customised alphanumeric followed by the identifier of the

store of value provider or the IPSP. For example, if Jane has a store of value with SoV provider A,

her long form alias will be Jane123@SoV1. The identifier after the “@” is used to identify the

store of value provider during transaction routing. A user is allowed to have multiple aliases at

one or more store of value providers. A short form alias is simply the mobile number of the user

that is linked to the full form alias. For example, Jane can link her full form (Jane123@SOV1) to

her mobile number 814567890.

Classification: Confidential

33

However, a mobile number cannot be a part of full form alias. When someone wants to pay Jane,

they simply ask for her mobile number and make payment. Note that Jane may also choose to

provide the payer with her full form handle. Jane can also generate a QR code on her mobile

application to receive payment.

Merchants will also have a full form alias and a short form alias. A merchant’s full form can also

be alphanumeric, but the short form alias will be an 8-digit unique number assigned to the

merchant by their store of value provider or IPS participant based on their own logic. For

multilane shops, a participant may assign a merchant ID and long form handle for each lane (till)

linked to one merchant account. Merchants will also be able to generate both static and dynamic

QR codes to receive payment and facilitate cash-out services. For government payments, a

beneficiary handle containing the beneficiary’s account number and the IFSC of the beneficiary

store of value provider will be used to process instant payments on behalf of the government.

Figure 6: Merchant alias model

The short form alias (mobile number for individuals and unique number for merchants) together

with the full form alias will be stored in the alias directory of the IPS Operator at onboarding to

enable the payer to only enter the payee’s mobile number when making a payment or sending

money. At any point in time, only one full form alias can be linked to a mobile number. A user

can link and delink a full form to their mobile number at any time.

Classification: Confidential

34

9.2.

Alias Registration

9.2.1. Individual and merchant registration

Alias registration can only be done in the following manner:

Entity

Description

Enabler

An Enabler can register a user, only if it has an arrangement with an IPSP
to access store of value providers. An Enabler can therefore assign the user
a full form alias that belongs to the IPSP or the store of value provider of
the user.

Store of Value
Provider

A store of value provider can onboard its own customers as well as a new
customer by assigning them a full form handle and linking it to a store of
value of the customer.

An IPSP can play 2 roles in registration. First, it can assist Enablers access
store of value providers during registration. This applies to cases where the
user being registered by the Enabler does not have a store of value with
the IPS participant of the Enabler. Second, it can assign its own handle
during registration if the user has a store of value with the IPS participant.
An IPSP can also be a SoV provider.

IPSP

Table 12: Alias registration

Figure 7: Go-live aliases

Classification: Confidential

35

9.2.2. Government payment registration

For government payment registration, the Currency Management and Banking Operations

(CMBO) department of the Bank of Namibia will register government payment recipients in

collaboration with the IPSPs. Government payments will leverage off existing accounts and

wallets and all recipients will be provided with a full form alias to be used by CMBO. The alias will

be in the form of account-no@ifsc-code.ifsc.npci. Government payments will be preauthorised

payments made to government beneficiaries through the aforementioned full form alias.

Government agencies will be required to verify the recipient’s information before assigning them

with an alias and obtaining consent for payments to be made through the IPS.

Classification: Confidential

36

10. USER REGISTRATION PROCESS

This section speaks to how a user will be onboarded for the first time to use services on the IPS.

A user can self-onboard using a mobile application of the IPSP / Store of Value Provider or the

central USSD menu provided by the IPS operator. Onboarding entails the user first performing

device binding, then linking their preferred store of value to a full form alias on the IPS and setting

an IPS PIN. Merchant onboarding is done by the merchant acquirer and is left up to the

participants to decide on the best approach to onboard merchant and assign them with a full

form alias, a merchant code, and both static and dynamic QR codes, were relevant and applicable.

10.1.

Device Binding Flow on Mobile Application

Before a mobile number can be used to register on the IPS through a mobile application, it must

be verified and bind to the mobile device wherein the sim card is placed. Thereafter, the user will

follow a verification process for the mobile number before creating an IPS Pin. The following

device binding process is provided:

Use Case ID

IPS-DB001

Use Case Name:

Device binding

Use Case Description:

This use case describes how a user binds their device to their mobile number

End Objective:

The user successfully binds their device and mobile number

Primary Actors:

User

Secondary Actors

IPS Participant
Store of value provider
Mobile Network Operator (MNO)

Trigger Event:

The user downloads and opens the mobile application of the IPSP / store of
value provider and intends to register on the IPS

Business Rules for IPS Participants

Classification: Confidential

37

1. Participant to obtain verification through the respective mobile network operator.

2.  Participant to store device binding information of the user.

3.  Only one mobile number can be bound to a mobile device at a time.

(Note: Here the binding would be one mobile number to one device to one app and that SIM should

be present in the device with active status.)

4.  Mobile number should be linked to store of value being used on the IPS.

5.  The mobile number cannot be entered but should be prepopulated.

6.  Participant must integrate with their SMS Gateway provider to get the VMN (Virtual Mobile Number)

on which the SMS will be sent from user device.

7.

SMS Gateway will send a response of this SMS to the Participant along with the mobile number.

8.  Participant must provide API endpoint to receive this response from SMS Gateway.

9.  Participant must acquire short code from SMS Gateway provider.

10. If a customer removes the sim card from the mobile device and inserts it later again, the device

binding process should be repeated.

Business Rules for IPS Operator

•

Integrate with the MNOs to verify mobile numbers against ID numbers

Conditions

1.  The user can bind their device using an Enabler’s mobile application (This is only possible if the Enabler

and the PSP have a relationship) or the IPS participant’s mobile application. This flow covers all device

binding scenarios regardless of the mobile application provider.

2.  The actions from the mobile application are triggered by the user (consent).

3.  SMS Gateway to be provided by the Mobile Network Operators.

Classification: Confidential

38

Basic Flow

Figure 8: Device binding

Step
ID

Actors

Action

1

2

3

4

5

6

Mobile App

Send a device binding request to the Payer’s
participant.

IPS

Payer
participant

IPS

Response to the mobile application with an SMS trigger
request.

Mobile App

Sends device details via SMS to the SMS Gateway.

SMS Gateway

Sends an SMS response to the payer IPS Participant.

Mobile App

Initiates a polling for device binding response to the payer
IPS participant.

Payer
participant

IPS

IPS participant requests a token from the IPS switch.

7

IPS Switch

IPS switch responds to the payer IPS participant with a
token.

Notes
references

and

token

This
is
used to identify
the device and
link it to the full
form and short
form alias of the
user.

Classification: Confidential

39

8

Payer
participant

IPS

Payer IPS participants respond to the mobile application
with a device binding response including the registration
token.

9

Mobile App

Sets passcode encrypted with registration token which is
send to the Payer IPS participant for storage in the
Common Library (CL).

End of use case

Table 13: Use case ID IPS-DB001

10.2. Mobile App First Time Registration

The user
receives a
notification that
the device has
been bind to the
mobile number.

This stage is
done with the 2-
stage verification
process.

Once the device binding process is successful, the second process is for the user to select their

preferred store of value provider and thereafter select the store of value (account or wallet) they

intend to register on the IPS. The user is then taken through the verification process with the

store of value provider, and the mobile network operator, if necessary. Finally, the user is

assigned with a handle and is required to set an IPS Pin. This detailed process is outlined below.

IPSPs are required to enable their mobile applications to allow IPS Users to self-register on their

mobile devices. In the case of a bank account linked to a debit card, verification is conducted by

the store of value provider, requiring the User to enter the last 6 digits of the debit card along

with the expiry date and PIN. If a bank account is not linked to a debit card, verification is done

through the store of value provider and the mobile network operator using the user’s national

ID. In the case of an e-money wallet, verification is done by the store of value provider by

validating the wallet PIN; e-money wallets that do not require a PIN cannot be onboarded onto

the IPS. All scenarios require the User to set a 6-digit IPS PIN (separate from their debit card PIN

or e-money wallet PIN).

Classification: Confidential

40

10.2.1. Account Onboarding through Debit Card: Mobile App

Basic Flow: Account (Debit card)

Figure 9: Mobile APP: Account (Debit card)

Step
ID

Actors

Action

Notes and
references

1

User

Commences with verification process on device and
provides consent to verify using Debit card.

2

Payer PSP

Sends ReqListAccount (Mobile Number, IFSC, Long
Alias) to IPS Switch.

3

4

5

IPS Switch

Forwards ReqListAccount to Issuer SoV Provider to
fetch all linked wallets/accounts.

Issuer SoV Provider

Returns RespListAccount containing list of SoVs
(wallets and accounts)

IPS Switch

Sends the RespListAccount back to Payer PSP.

Classification: Confidential

41

6

7

8

9

Payer PSP

User

Displays returned list and prompts user to select
preferred SoV.

Selects the SoV (account) to link with IPS and
chooses Debit Card verification.

Payer PSP

Sends ReqOTP to IPS to initiate Issuer OTP flow

IPS Switch

Forwards ReqOTP to Issuer SoV Provider

10

Issuer SoV Provider Sends OTP to the user’s registered mobile number

11

Issuer SoV Provider Sends RespOTP to IPS confirming OTP

12

IPS Switch

Forwards RespOTP to Payer PSP so user can input
OTP.

13

User

14

Payer PSP

15

IPS Switch

Enters Debit Card Details (last 6 digits, expiry date
and PIN), IPS PIN and OTP

Forwards Debit Card details, IPS PIN, and OTP to IPS
via ReqRegMob API

Forwards ReqRegMob payload to Issuer SoV
Provider for validation.

16

Issuer SoV Provider

Validates Debit Card details, OTP, and stores IPS
PIN; returns RespRegMob

E

17

IPS Switch

Forwards RespRegMob response from Issuer SoV
Provider

18

Payer PSP

Updates registration status on user interface

19

User

Chooses option to link mobile number with long
alias

20

Payer PSP

Sends ReqRegMapper to IPS for alias mapping.

21

IPS Switch

22

Payer PSP

Executes mapping and returns RespRegMapper
confirmation.

Updates final status to customer (registration + alias
link completed)

Classification: Confidential

42

End of use case

Table 14: Mobile APP: Account (Debit card)

10.2.2. Account Onboarding through National ID: Mobile App

The table below depicts the 2-stage verification process through which as user is verified by both

a participant and an MNO. The customer should provide consent for both the IPSP and MNO to

verify their information. If the customer declines to provide consent, the verification process fails.

Figure 10: Account Onboarding using National ID Flow

Actors

Step
IPSP verification
User
1

Actions

Notes and references

Commences with
verification
process on device and provides
consent to verify using National ID.

2

3

4

Payer PSP

IPS switch

Issuer SOV provider

Sends ReqListAccount to capture
mobile number, IFSC and long alias
Forwards request to Issuer SoV
Provider to fetch all accounts and
wallets (SoVs) linked to the verified
mobile number.
Responds with RespListAccount
11-digit
containing

SoVs,

all

Classification: Confidential

43

Full 11-digit
ID stored
encrypted within IPS for
MNO verification.

National ID entered on PSP
app (not on CL).

If mobile number is not
linked to user, the
verification process fails

5

6

7

8

9

IPS switch

Payer PSP

User

Payer PSP

IPS Switch

MNO verification
MNO
10

11

IPS Switch

12

13

15

16

17

18

Issuer SoV Provider

Issuer SoV Provider

User

Payer PSP

IPS Switch

Issuer SoV Provider

National
enablement flag.

ID, and National

ID

Sends RespListAccount response
to the PSP, but only shares the last
6 digits of the National ID.

Displays the
list of SoVs and
prompts the user to select one
that
ID
supports National
verification.
Selects the National
ID-enabled
account and opts for verification via
National ID by entering all 11 digits
on the PSP app.
Validates last 6 digits of National ID
entered with the ID shared by IPS.
Sends ReqRegOTP to IPS Switch for
verification using National ID.
to verify
the MNO
Requests
National ID and mobile number by
sharing
the encrypted 11-digit
National ID and verified mobile
number with MNO.

MNO responds with verification to
the IPS if mobile number is
registered and linked.
If MNO verification succeeds,
forwards the request to the Issuer
SoV Provider to generate bank
OTP.
Sends OTP to the user’s registered
mobile number.
Forwards RespOTP to Payer PSP
through IPS to prompt the user for
OTP entry.
Enters the bank OTP and sets IPS
PIN (set and confirm) on the PSP
interface (CL library).
Sends OTP and IPS PIN to IPS via
ReqRegMob API.
Forwards OTP and IPS PIN to the
Issuer SoV Provider for final
confirmation.
Validates OTP and confirms PIN
registration;
with
success/failure to IPS.

responds

Classification: Confidential

44

19

20

21

22

23

IPS Switch

Payer PSP

User

Payer PSP

IPS Switch

24

Payer PSP

Table 15: Mobile App: ID

Sends confirmation back to the
Payer PSP.
Updates App with
registration
status from bank (success/failure).
link
Customer selects option to
mobile number to long alias
Sends ReqRegMapper request to
IPS to link alias.

Confirms successful linking of long
alias with
registered mobile
number.
Updates the status to customer
(registration + alias link completed).

10.2.3. Account Verification Rules

1.  Verification of a bank account should be done by validating the customer’s debit card which
    entails using the last 6 digits of the debit card, the expiry date and the PIN. Upon successful
    verification, the SOV provider should send the customer an OTP which completes the 2-factor
    authentication.

2.  In case of verification through a customer’s debit card information at the bank, national ID

verification is not required.

3.  If the customer does not have a debit card, national ID verification is required whereby the
    mobile number detected in the mobile phone should be verified at the MNO to see whether
    that mobile number is linked to the User’s national ID number. The user enters the full 11-
    digit National ID, and IPS verifies the last 6 digits of that ID shared by the issuer. IPS then sends
    a verification request to the MNO. Upon successful verification, the MNO sends a success
    response which then allows the User to proceed with setting an IPS PIN.

4.  For verification through the national ID, both the participant and the MNO should verify 2
    parameters i.e., mobile number and the last 6 digits of the customer’s ID against their
    respective records of the customer. If there is a successful match, the SoV Provider should
    send the customer an OTP to complete the 2-factor authentication process. Example: If
    National ID is “98203733790”, then the last 6 digits that shall be verified are “733790”. If the
    debit card details do not match the record at the participant, the verification fails.

5.  If the 2 parameters used during the national ID verification do not match the records at both

the participant and the MNO, the verification fails.

6.  Successful verification is confirmed when the user enters the valid OTP sent by the store of
    value provider and the OTP is successfully validated by the SoV provider by comparing the
    OTP entered by the User and the OTP issued by the SoV provider.

Classification: Confidential

45

7. The verification is considered complete only when both MNO and SoV providers send
successful response to IPS. Customer should not be allowed to set an IPS PIN until both the
processes i.e., MNO verification and SoV OTP verification are completed.

10.2.4. Wallet Onboarding through Wallet PIN: Mobile App

Basic Flow: Wallet PIN

Figure 11: Mobile Wallet PIN

Step
ID

Actors

Action

Notes and
references

1

User

Commences with verification process on device and
provides consent to verify using Wallet Pin.

2

Payer PSP

Sends ReqListAccount request to IPS Switch,
including the user’s mobile number, IFSC, and long
alias.

Classification: Confidential

46

3

4

5

6

7

8

9

IPS Switch

Forwards the ReqListAccount request to the
selected Issuer SoV Provider (Wallet Issuer).

Issuer SoV Provider

Responds with the list of Store of Value Providers
linked to the mobile number.

IPS Switch

Payer PSP

User

Sends RespListAccount (list of SoVs – wallets &
accounts) back to Payer PSP.

Assigns the long alias and presents an option to the
user to set up an IPS PIN using their wallet PIN

Selects the (SoV) wallet to link with IPS.

Payer PSP

Sends ReqOTP to IPS for the selected wallet.

IPS Switch

Forwards ReqOTP to Issuer/Wallet (SoV) Provider.

10

Issuer SoV Provider

Sends OTP to customer (registered mobile).

11

Issuer SoV Provider

Sends RespOTP to IPS confirming OTP dispatch.

12

IPS Switch

Forwards RespOTP to Payer PSP

13

User

Enters Mobile Wallet PIN, sets IPS PIN (set &
confirm), and enters OTP in the PSP app (CL library).

14

Payer PSP

Forwards details to IPS via ReqRegMob API (Wallet
PIN, IPS PIN, OTP).

15

IPS Switch

Forwards ReqRegMob to Issuer (SoV) Provider for
verification and IPS PIN registration.

16

Issuer SoV Provider

Verifies Wallet PIN and OTP, returns RespRegMob
(response from bank) to IPS.

17

IPS Switch

Forwards RespRegMob (response from bank) to
Payer PSP.

End of use case

18

Payer PSP

Updates App with registration status from bank
(success/failure).

Classification: Confidential

47

19

User

Chooses “Link mobile number with long alias” (alias
directory link).

20

Payer PSP

Sends ReqRegMapper to IPS to link the mobile
number to long alias.

21

IPS Switch

IPS confirms the linking of mobile number and long
alias.”

22

Payer PSP

Updates the status to customer (registration + alias
link completed).

End of use case

Table 15: Mobile Wallet: PIN

10.3.

Registering User Store of Value

Use Case ID

IPP-AR001

Use Case Name:

First time registration through an IPS Participant

Use Case Description:

This use case describes the registration process for a first-time user of the IPS.
The user never had an alias registered on the IPS before

End Objective:

The user is successfully registered

Primary Actors:

User

Secondary Actors

• SoV Provider
•

IPSP

Trigger Event:

The user approaches or is approached by an IPS participant to register an alias
on the IPS

IPS Participant Business Rules

1.  The IPS Participant must provide the User with a list of all Store of Value Provider onboarded onto the

IPS Switch.

2.  The user must not be allowed to proceed if the selected SoV is not active or has derogatory status

(fraud related). In the non-active derogative state, the store of value provider must reject the

registration request.

Classification: Confidential

48

3. The user must be shown the full form alias details; this includes the handle associated with the user’s

store of value.

4.  The user must be given the option to stop proceeding / exit the alias registration at any stage of the

user journey up to the successful notification step.

5.  The user may only be able to have one default alias at any given time.

6.  The User (with consent) will be able to override any previous default alias registrations in the

Operator’s Alias Directory.

Pre-conditions

1.  The user must have a registered store of value with the SoV Participant.

2.  The user must have an active connection / signal to use the IPS Product (App or USSD).

3.  The user must be using the sim card connected to the alias that the user intends to register.

4.  The SoV would need to be active and have no derogatory status regarding fraud; and not be

backlisted/hot listed (in the case where one is created as part of the FRM solution).

5.  The user registering an alias has met regulatory requirements as the individual would have an existing

SoV with a SoV Participant (such as KYC requirements).

Post-conditions

1.  The user must receive a notification that the user’s alias, SoV and PIN have been registered.

2.  The user must be notified of the associated store of value linked to the user’s alias.

10.4.

Central USSD First Time Registration

The registration process through USSD will be different from that of mobile application. For Go-

live, USSD registration will be provided by the IPS Operator. Registration through a participant's

USSD channel will not be permitted. USSD has a limited functionality which will not allow Users

to verify themselves using OTP. In case of a bank account, verification will be done through the

store of value provider which requires the User to enter the last 6 digits of the debit card linked

to the account and the expiry date. Bank accounts that do not have a debit card linked to it cannot

be onboarded using the central USSD channel. In the case of a e-money wallet, verification will

be done through the store of value provider by validating the wallet PIN. E-money wallets that

Classification: Confidential

49

do not require a User to enter a PIN will not be onboarded onto the IPS. Given the limited

functionality of USSD, verification through the MNOs (national ID verification) will not be feasible

for go-live.

10.4.1. General Rules for USSD Registration

Use Case ID

IPP-AR002

Use Case Name:

Alias registration through USSD

Use Case Description:

In this use case, the user registers a full form construct using the USSD menu.

End Objective:

User registers an Alias

Primary Actors:

Secondary Actors

• User
• Central USSD

• User SoV Provider
• MNO

Trigger Event:

A user opens the IPS central USSD channel

IPS participant business rules

1.  The user must not be allowed to proceed if the selected SoV is not active or has derogatory status (fraud

related). In the non-active derogative state, the bank must reject the request.

2.  The user must be shown the full Alias details; this includes the handle associated with the user’s store of

value.

3.  The user must be given the option to stop proceeding / exit the Alias registration at any stage of the user

journey up to the successful notification step.

4.  The User (with consent) may be preboarded by the SoV Provider, but the full form alias should not be

active until the user accepts the terms of service and adds a IPS pin.

IPS switch business rules

1.  Non-bank store of value providers to be issued with an identifier by the IPS Operator.

2.  The process of linking the mobile number to the full form alias should be automated for USSD –

Customer’s consent is only needed.

Classification: Confidential

50

3. For USSD registrations, the SPV acting as a PSP on IPS is responsible for generating and allocating the

alias.

4.  The alias is created before SoV selection and is linked to the user’s registered mobile number.

10.4.2. Account Onboarding through Debit Card: USSD

Basic Flow: Account

Figure 12: USSD registration Account

Step
ID

1

2

3

4

5

Actors

Action

Notes and
references

User

The user dials USSD code (*140*140#)

MNO Gateway

Identifies the IPS code and sends it to the USSD PSP

USSD PSP

The USSD PSP returns the IPS menu to the MNO

User

Selects registration from the submenu

MNO Gateway

Identifies the registration code and sends to USSD PSP

Classification: Confidential

51

6

7

8

9

USSD PSP

Sends the registration request to the IPS switch through
ReqListAccPvd

IPS Switch

Returns all Store of Value Providers registered on the IPS

User

Selects the preferred SOV Provider

USSD PSP

Sends the information to the IPS switch and requests for
the store of values of the User

10

IPS Switch

Requests the User’s SOVs from Payer’s SOV Provider
through ReqListAccount

11

Payer SOV Provider

Returns all applicable SOVs of the User

12

IPS Switch

Returns all applicable SOVs of the User to the USSD PSP for
the User to make a selection.

13

User

14

USSD PSP

15

IPS Switch

Selects accounts.
Selects to verify using debit card
Enters debit card last 6 digits and expiry date
User sets IPS PIN

Initiates verification process to the IPS switch through
ReqRegMob

Sends verification and registration request to the Payer
SOV Provider

16

Payer SOV Provider

Verifies debit card details and IPS PIN and sends
verification success to the IPS switch through
RespReqMob.

17

IPS Switch

Relays this information to the USSD PSP which further
reaches the MNO gateway

18

MNO Gateway

User gets confirmation that they have successfully linked
their account to IPS, receives a long alias and is given the
option to link their mobile number to their long alias.

19

User

Selects the option to link their mobile number to long alias

20

USSD PSP

Triggers a request to the IPS switch through
ReqRegMapper to map User’s mobile number to long alias.

21

IPS Switch

Confirms the linking of the mobile number to the long alias
through ResReqMapper to the USSD PSP

Classification: Confidential

52

22

MNO Gateway

User gets notification that their mobile number has been
mapped to the long alias and registration is now complete.

End of use case

Table 16: Use case ID IPP-UC80

10.4.3. Wallet Onboarding through Wallet PIN: USSD

Basic Flow: Wallet

Figure 13: USSD registration Wallet

Step
ID

1

2

3

4

Actors

Action

Notes and
references

User

The user dials USSD code (*140*140#)

MNO Gateway

Identifies the IPS code and sends it to the USSD PSP

USSD PSP

The USSD PSP returns the IPS menu to the MNO

User

Selects registration from the submenu

Classification: Confidential

53

5

6

7

8

9

MNO Gateway

Identifies the registration code and sends to USSD PSP

USSD PSP

Sends the registration request to the IPS switch through
ReqListAccPvd

IPS Switch

Returns all Store of Value Providers registered on the IPS

User

Selects the preferred SOV Provider

USSD PSP

Sends the information to the IPS switch and requests for
the store of values of the User

10

IPS Switch

Requests the User’s SOVs from Payer’s SOV Provider
through ReqListAccount

11

Payer SOV Provider

Returns all applicable SOVs of the User

12

IPS Switch

Returns all applicable SOVs of the User to the USSD PSP for
the User to make a selection.

13

User

14

USSD PSP

15

IPS Switch

Selects wallet
Selects to verify using wallet PIN
Enters wallet PIN
Sets IPS PIN

Wallet PIN
should be
between 4 to
6 digits only

Initiates verification process to the IPS switch through
ReqRegMob

Sends verification and registration request to the Payer
SOV Provider

16

Payer SOV Provider

Verifies Wallet PIN and IPS PIN and sends verification
success to the IPS switch through RespReqMob.

17

IPS Switch

Relays this information to the USSD PSP which further
reaches the MNO gateway

18

MNO Gateway

User gets confirmation that they have successfully linked
their Wallet to IPS, receives a long alias and is given the
option to link their mobile number to their long alias.

19

User

Selects the option to link their mobile number to long alias

20

USSD PSP

Triggers a request to the IPS switch through
ReqRegMapper to map User’s mobile number to long alias.

Classification: Confidential

54

21

IPS Switch

Confirms the linking of the mobile number to the long alias
through ResReqMapper to the USSD PSP

22

MNO Gateway

User gets notification that their mobile number has been
mapped to the long alias and registration is now complete.

End of use case

Table 17: Use case ID IPP-UC80

10.5.

Setting IPS Pin

Once the user has been verified, he/she will be allowed to set an IPS Pin. The CL (Common Library)

screen of the store of value provider should appear.

Figure 14: Setting IPS Pin

1

2

3

IPS Participant

IPS Switch

SoV Provider

The CL screen encrypts all details and sends

them to IPS switch for verification.

Invokes an API, ReqRegMob, to the store of

value provider and sends all details.

The issuing store of value provider decrypts

all details, verifies them, invokes an API,

RespRegMob, to the IPS switch and shares a

response with it.

Classification: Confidential

55

4

#

IPS Switch

Sen ds the information to the IPS Participant.

IPS Participant

The SoV provider saves the PIN details of the

customer for future authorizations.

The PIN is set.

End of Use Case

Conditions

1.

2.

3.

IPS Pin is always set against a store of value.

IPS Pin should be 6-digits.

If an IPS PIN is already set through an IPS supported application against a store of value, then the

customer does not need to set the PIN again on any other IPS-supported application against the

same store of value.

4.

If the IPS PIN is already set against a store of value in one application, the SoV Provider shall revert

with the tag mbeba=”Y”. The application does not prompt the user to set the PIN against the same

store of value on another application.

In case of mbeba=”N”, the application prompts the user to set a IPS PIN.

Classification: Confidential

56

11. ALIAS DIRECTORY

The centralized alias directory is used for customer onboarding. The Directory will be maintained

as a separate service in the IPS switch ecosystem to help link full form aliases to mobile numbers

for individual customers and unique numbers for merchants. Post completing the new user on-

boarding process, users shall be prompted to link their mobile number or unique number for

Numeric ID generation. For purpose of this section, an individual number or merchant ID linked

to their respective full form alias will be collectively referred to as a “user ID”.

11.1. Mobile Number Rules

a) Users will not be allowed to enter their mobile number when registering a store of value on

the IPS.

b) Only a mobile number that is linked to a store of value (bank account or wallet) can be used

for onboarding and mapping.

c) Any leading zero “0” in the user mobile number or user mobile number starting with country

code “+264” must be removed by the IPS participants and the mobile number shall be 9-digit.

For example, Jane can choose to provide her mobile number as 0812345679 or

+264812345679 but her IPS participant must ensure to remove the leading zero “0” or “+264”

when linking her mobile number to a full form in Alias Directory.

d) To ensure proper routing and validation of mobile-based payment instructions, each

participant and the IPS switch must implement logic to identify the Mobile Network Operator

(MNO) based on the mobile number prefix:

i)

ii)

MTC numbers begin with the prefix 081.

Telecom Namibia (TN) numbers begin with the prefix 085.

e) In the IPP format, the leading zero is omitted, and mobile numbers are represented as 9-digit

numeric strings:

i)

MTC mobile number appears as 812XXXXXX

Classification: Confidential

57

ii)

TN mobile number appears as 852XXXXXX

f) Participants must use this prefix logic to:

i)

ii)

iii)

iv)

Validate the issuer network associated with a mobile number.

Route the transaction accordingly in systems that require MNO identification.

Support network-specific error handling or routing in cases of failure or timeouts

This logic must be consistently applied for all IPP-compliant transactions initiated

via mobile numbers.

g) In the alias directory, Jane’s mobile number will be stored as 812345679 linked to her full

form e.g., jane123@SoV1.

h) Mobile numbers can only be reused after 6 months. And since the customer is not inserting

the mobile number but rather this is automatically linked to the account / wallet, the

customer will in any case have to update their KYC at the participant before binding a mobile

number.

i) Where a new Mobile Network Operator (MNO) is added in future, routing logic at the IPS

switch must be updated to include the new MNO prefix ranges.

11.2. Merchant Unique Code Rules

a) Each participant to assign merchant codes based on their own logic. For multilane shops, a

participant may assign a merchant ID and long form handle for each lane (till) linked to one

merchant account.

b) The merchant unique code cannot exceed 8 digits or else it will conflict with the mobile

numbers already stored in the directory.

c) Only SMEs, MSMEs, and large merchants qualify for unique codes, sole traders will be treated

as individuals meaning their full form aliases can be linked to their mobile numbers.

11.3.

General Alias Directory Rules

a) Mobile Numbers and Unique numbers will be unique within the alias directory.

b) Only one full form alias can be linked to a mobile number or a unique merchant number at a

point in time, in an ‘Active’ State.

Classification: Confidential

58

c) Mobile Number (short form alias) can be made ‘Inactive’ with a given IPS participant.

However, in this case the long form alias with the same IPS participant may remain active and

the user can receive money over his/her long form alias. Having said this, the same mobile

number linked to a full form alias with a different IPS participants may exists in the alias

directory.

d) Any merchant unique number can be deregistered. The ‘Deregistered’ unique number will be

existing for the merchant to be made ‘Active’ within 6 months.

e) IPSPs can block/unblock mobile numbers or merchant IDs.

f) Transfer of merchant IDs between IPS participants is not allowed.

g) Transfer of Mobile Numbers between full form aliases of different IPS participants will be

allowed.

h) When the user de-register’s the mobile application, the IPS participant must deactivate the

corresponding mobile number.

i) The alias linking in the Directory will happen based upon customer consent.

j) Unique numeric ID for Merchant should not be more than 8-digit long.

k) Unique numeric ID for Merchant with all the same digits (0-9) is not allowed.

11.4.

Alias Directory Operations

a) During the linking of a user ID, consent from the user will be taken for storing the data

(Numeric ID / Mobile Number).

b) Then the registration process will begin by sending the request through ReqRegMapper API.

The ReqRegMapper API will store the details in alias directory in an encrypted format.

c) The ReqRegMapper API shall perform various operations in the alias directory given below:

i)

ii)

Add – Create a new user ID at the time of registration of the full form alias.

Modify – Modify the user ID against full form alias by selecting any of the

created user IDs or Update the user ID as Mobile Number against the full form

alias.

Classification: Confidential

59

11.5.

First Time User ID Registration Flow

Use Case ID

IPS-AD001

Use Case Name:

Creation of IPS ID as mobile number by new user

Use Case Description:

This use case describes how a user links their mobile number to their full form
alias to create an IPS user ID

End Objective:

Mobile number linked to full form alias

Primary Actors:

User

Secondary Actors

IPS participant

Trigger Event:

A new user while onboarding selects the store of value provider, sends the
mobile number, store of value code and gets the account or wallet number
verified through ListAccount API

IPS participant business rules

1.  The user already has an active full form alias.

2.  Then user selects a PIN and sends it via ReqOtp API to Issuer SoV Provider and the OTP will get initiated

and validated by the user against his/her credentials on the common library page.

3.  Once the PIN has been set, the IPS Participant will prompt a request of creating a User ID. On taking

consent, a User ID shall be entered by the user.

4.  On entering the User ID, the ReqGetAdd API will be triggered to check the availability of the ID.

IPS Switch business rules

All RegMapper API requests will be validated against the Org ID and Handle with the addr tag to avoid

invalid requests.

Basic Flow

Classification: Confidential

60

Figure 15: First time user ID registration flow

Step
ID

Actors

Action

Notes
references

and

1

2

3

4

IPS
participant

On success response, the IPS Participant shall initiate
ReqRegMapper API with full form alias and Numeric ID
(Numeric ID can be mobile number) to the IPS switch.

IPS Switch

IPS switch sends a request for the Alias Directory to store
the user’s ID and link it to the full form alias.

Alias
Directory

Alias Directory stores the details. It will check and
validate in both, Master, and Audit tables within the
Directory. Alias Directory responds to the IPS switch

IPS Switch

The IPS sends response to IPS Participant through
RespRegMapper API to the IPS switch and customer is
successfully on boarded with the user ID.

End of use case

Table 18: Use case ID IPS-AD001

Classification: Confidential

61

11.6.

Creation of IPS Number as Numeric ID Existing User

a) Existing user with a full form alias already linked to a mobile number can override this link in

the alias directory.

b) Linking a new mobile number to an existing full form will override the initial link that exists in

the alias directory.

c) Since the mobile number linked to a full form should be the same mobile number to which

the store of value can be identified, the user will be required to update their KYC details at

their store of value provider.

d) In this scenario, there will be a validation from the store of value provider to ensure that the

Device ID of the initiator is the same as the Mobile Number being linked.

11.7.

Deregistration of a Mobile Number

a) During de-registration of a mobile number, ReqRegMapper API will initiate the Modify

‘DEREGISTER’ request through ReqRegMapper API to IPS switch from the sender.

b) The IPS switch will validate the mobile number for active/inactive status and change status

of the mobile number to ‘DEREGISTER’.

c) There is no cooling period for the deletion of mobile number. If the mobile number must be

reused as a user ID, then a registration process must be followed.

11.8.

Deregistration of a Unique Number

a) For a merchant unique ID, the exact same unique number, which was successfully registered

previously, will go through the process of deregistration by using the ReqRegMapper API.

b) Once the merchant ID is deregistered there will be a cooling off period of 6 months which is

configurable, and the ID will not be allocated to other users. However, the ID can be reclaimed

by the same full form alias of the merchant through which it has been deleted.

c) In case of a deregistration request, the expiry will be shared in the response and the IPS

Participant can refer the same to calculate the cooling period of the Merchant ID.

Classification: Confidential

62

11.9.

Transfer of Mobile Number between IPS Participants

a) User will be allowed to transfer Mobile Numbers as User IDs between IPS Participants.

b) During such modifications, the user must select the update mobile number as User ID option

from the application on which the number has to be activated.

c) Then the user App will validate the details using GetAddress API with type ‘PORT’ and display

the existing ID which has been already active in a different application such as

MobileNumber@Activehandle using Get Address API.

d) During this operation, the ‘addr’ tag is populated if the ID exists and already mapped to any

other IPS Participant.

e) The IPS Operator will populate the ‘addr’ only when the ID is in status ‘Active’ or ‘Inactive’

f) In case of ‘Block’ the ‘addr’ will not be retrieved only the status will be fetched and portability

will not be allowed.

g) When the user selects the ID and decides to PORT it to the current IPS Participant, ReqReg

API will initiate the modify request to the IPS switch and the mobile number shall be updated

to current IPS Participant.

h) The preVPA tag of ReqRegmapper will have the ID of the Old IPS Participant during the

transfer. The presence of this tag is the identifier of the transfer operation.

i) Once the transfer is complete ReqMapperConfirmation API will be sent to Old IPS Participant.

Classification: Confidential

63

11.10. Register to Alias Directory

S No Scenario

Operation
(op)

setStatus

Comment

1

2

3

4

5

6

Create Merchant ID as User ID

ADD

Create Mobile Number as User ID ADD

NEW

NEW

Transfer of Mobile Number to
different IPS Participant

MODIFY

ACTIVE

Activate the already created
Merchant ID against the full form
alias

MODIFY

ACTIVE

ID against
Update Merchant
different full form alias for same
IPS participant (change full form
alias)

MODIFY

ACTIVE

Activate by creating Merchant ID
against the full form alias and
deactivate the current active
Merchant ID

ADD

7

Deactivate the Mobile Number MODIFY

DEREGISTER

8

Deactivate the Merchant ID

MODIFY

DEREGISTER

9

10

11

the

Reclaim
deactivated
Merchant ID against Same full
form alias

MODIFY

ACTIVE

Reclaim
Mobile Number

the deactivated

the

MODFIY

ACTIVE

the Mobile Number/

Block
Merchant ID

MODIFY

BLOCK

Before: CMUser@sov1,
842212345
After: CMUser@sov2,
842212345

Before: Shop1@SoV1, 1234567
After: Shop1@SoV1, 6789011
(6789011 is already created and
it is in 'inactive' state)

Before: Shop1@SoV1,
1234567
After: Shop1A@SoV1,
1234567

Before: Shop1@SoV1,
1234567
After: Shop1@SoV1, 2121212
(212121 will be created and
made to active)

No cooling period for mobile
number deletion

'1234567 will be available only
after 6 months.

The deleted record will be in
‘INACTIVE’ state
in CM. the
same can be updated to
‘ACTIVE ‘by the same user.

IPS Participant will initiate a
Block and
IPS Participant can block only its
own

Classification: Confidential

64

S No Scenario

Operation
(op)

setStatus

Comment

User ID

12

Unblock the Mobile Number/
Merchant ID

MODIFY

UNBLOCK

IPS Participant will initiate the
Unblock

User can
initiate delete all
request to IPS Participant. IPS
Participant in turn will initiate
the request one by one to the
IPS switch

from

There is no way to differentiate
the cases, when the new user
request
surrendered
mobile number or Existing user
changing the
App
During transaction user must
verify the recipient’s address

New Profile and full form alias
will be created for a New Mobile
Number i.e., Fresh
Registration

13

Deactivate
Merchant ID

the

multiple

MODIFY

INACTIVE

14

Mobile number surrendered by
existing
without
user
deactivating and new user
requested for the creation of a
short form Alias as Mobile
Number

MODIFY

ACTIVE

15

Linking new Mobile Number
against existing full form alias

16

Creating Merchant ID and Mobile
Number as a single request

17

Creating multiple Merchant ID as
a single request

Not Applicable

18

Individual User creating a unique
number (like merchant ID)

Table 19: Register scenararios for alias directory

Note: If the IPS User ID exists already, consent must be obtained from customer to modify it.

Classification: Confidential

65

11.11. ReqValAdd API

This API has been enhanced and facilitates IPSPs to fetch “Beneficiary Name” & “full form alias”

that have been linked with the User ID, during financial transactions.

Figure 16: ReqValAdd API

Step ID

Actors

Action

Notes and references

Customer

IPS Switch

Customer enters the desired User ID
(Alias Directory ID) and the payer
IPSP fires a ReqValAdd API with
payee’s address
format
XXXXXXXX@mapper.npci to fetch
the linked full form alias

in the

IPS Switch initiates request to the
alias directory for fetching the linked
full form alias.

The alias directory responds back
with the linked full form alias against
the User ID.

IPS Switch

IPS Switch then initiates ReqValAdd
to Payee IPSP.

1

2

3

4

Classification: Confidential

66

5

6

7

IPS Participant
Payee
through RespValAdd with
existing parameters

responds
all

The same response is sent by the IPS
switch to RespValAdd to Payer IPS
Participant. Using this, the Payer IPS
the
Participant will
beneficiary’s name in the App

display

form

Once customer enters IPS PIN and
authenticates, a PAY transaction
shall be initiated this time using the
full
the
RespValAdd. The user ID (mobile
number or merchant ID) should not
be used as the payment address in
the financial transaction

obtained

in

Once the step 7 is
completed, the
verfification flow shall
be initiated i.e. section
12.1

End use case

Table 20: ReqValAdd API

11.12. Get Address API

a) This API is majorly used to retrieve the full form alias linked to the merchant ID or mobile

number.

b) The customer can use his own credentials for enquiry. IPS participants should not allow any

3rd party to fetch the different credentials.

c) This API is also used during onboarding to see the availability of the selected User ID.

d) GetAdd is mandatory for the below scenarios:

i) Creation of User ID (Mobile Number / Merchant ID)

ii) Transfer of Mobile Number to different IPS participants

e) For Other Scenarios GetAdd is not mandatory for scenarios but IPS participants can still do

GetAdd if required.

11.12.1.

Types of GetAdd

GetAdd will have 3 types called ‘CHECK’, ‘FETCH’ and “PORT”.

Classification: Confidential

67

CHECK

a) Type ‘CHECK’ is used to fetch the last updated status of the User ID. Supports to retrieve the

status of both ‘Numeric ID’ and ‘Mobile Number’.

b) The status of User IDs of current initiated PSP profile only can be retrieved.

c) If the ‘Mobile Number’ is active or inactive in other IPS Participants, the system will throw

error, and the status cannot be retrieved.

d) If requested Numeric ID is in ‘Active or Inactive or Block or Deregister’ status, PSP should

inform user that number is not available and in case of status ‘New’ PSP will allow to create

the number as IPS User ID. ‘addr’ tag will not be populated.

PORT

a) Type ‘PORT’ is used while transferring mobile number from one IPS Participant to Other IPS

Participants. Supports only ‘Mobile Number’.

b) User can use this to check if the mobile number is already mapped and in Áctive’ or Ínactive’

status with other IPS Participants.

c) The áddr’ tag will give complete full form alias without any masking.

d) Alias Directory will reject the request when ‘PORT’ is used for creation of New User ID (Mobile

Number).

FETCH

a) Type ‘FETCH’ will have subtype ‘ÍD|FullFormAlias’ for retrieve functionality. Subtype

‘FullFormAlias’ – Retrieves all mapped User IDs of the corresponding full form alias.

b) Subtype ÍD’- User will give both Full Form Alias and User ID, the system would say if the

combination exists or not.

c) The status of the User ID of current initiated IPS Participants profile only can be retrieved.

Classification: Confidential

68

11.13.

IPS Participants Sync

The approach to sync the list of IPS User IDs Registered / Modified / Deleted between IPS

Participants and the IPS alias directory has been described below.

a) Firstly, any operation that is performed on the User ID will be notified in a response to the

IPS Participants through Online.

b) During ‘PORT’ (Transfer of Mobile Number from One IPS Participant to Other IPS Participants),

the Previous IPS Participant will also be notified through ReqMapperConfirmation API.

c) Also, the status of User ID can be retrieved through Online using ReqGetAdd API ‘Check’ &

‘Fetch’ option anytime.

Along with above provision, the IPS Operator will also facilitate SoV Provider/ IPS Participant

providing a Day Wise Report through the IPS Real Time Clearing and Settlement (IRCS) system.

In the provided Alias Directory Report an entry will be made for every operation or the changes

performed on the User ID in a corresponding day.

Field Name

Description

addr

cmId

Full form alias of the Customer

User ID

cmId Type

Merchant ID | Mobile Number

Code

Merchant Code in case of P2M Transaction

Status

NEW|ACTIVE|INACTIVE|DEREGISTER|BLOCK|UNBLOCK

Channel

Mobile

lastUptdTs

Last Updated Time Stamp

expiryTs

Expiry Time Stamp

API Name

ReqRegMapper

Operation

ADD|MODIFY

Table 21: Alias directory report entry

Note: The Mobile Number will be masked as NNNXXXXNNN. N- Number , X – Masked Value. The

report will be provided in a CSV format as Mapper_BBB_DDMMYY_NC.csv / pgp /zip

Classification: Confidential

69

12. FUNCTIONAL FLOWS

The following functional flows aim to indicate how messages will flow between IPS participants

and the IPS Switch. Different financial and non-financial flows are provided for. It also provides

more detail around the use cases, the business rules for both the IPS participants and the IPS

Switch. The functional flows for the following use cases are provided:

a) Send Money (P2P) Payee Detail Verification

b) Send Money (P2P)

c) Send Money (P2P) USSD payment

d) Merchant Payment (P2B/M) Use Case

e) Cash-in at Merchant Use Case

f) Cash-out at Merchant Use Case

g) G2P (Bulk Payment Use Case)

h) Cash-out at ATM

12.1.

P2P Transactions: Send Money (Mobile App)

12.1.1. Verification

The first step in any IPS payment process is the verification step whereby the IPS Switch verifies

the details of the beneficiary. The verification phase is done as the first step of a 2-step payment

process. This ensures that the payment reaches the intended beneficiary.

Use Case ID

IPP-UC101

Use Case Name:

Send Money: Verification of payee details from one SoV Provider to another SoV
Provider

Use Case Description:

This use case describes how a payer verifies the mobile number of the payee
before a credit transfer is made

End Objective:

Verified mobile number

Primary Actors:

User

Classification: Confidential

70

Secondary Actors

• Payer SoV Provider
• Payee SoV Provider

Trigger Event:

The user inserts a mobile number into the channel and initiates a credit transfer
to the mobile number.

IPS Participant Business Rules

1.  Both payer and payee are registered on IPS.

2.  Payee not blacklisted.

3.  The Payer SoV provider’s channel should enable the payer to first verify payment details before the

credit is initiated.

4.  The payer should be able to pay to both a mobile number or the full form alias construct.

5.  The User should first enter their IPS pin before they can access the various IPS services. The 2-factor

authentication will therefore be required before a payment is made.

IPS Switch Business Rules

1.  The payee’s mobile number should have been linked to an active full form alias.

2.  The full form construct linked to the beneficiary’s mobile number is what will be validated in this use

case.

3.  For validating the beneficiary details based on sender entered beneficiary alias, ReqValAdd API is used

and response to this API from Payee IPS participant will be through RespValAdd API.

Basic Flow

Figure 17: P2P Transactions: Send Money through IPS Participant

Classification: Confidential

71

Notes and references

The User should first
IPS pin
enter their
before they can access
the
IPS
various
services. The 2-factor
authentication
will
therefore be required
before a payment is
made.

The switch sends the
short form alias in the
format
of
xxxx.mapper@npci

Step
ID

Actors

Action

1

Payer

Payer access their preferred IPS channel (e.g. APP
provided by the Issuer (App Provider), or the universal
USSD) and navigates to the send money option and
provides the Payee’s alias (mobile number).

2

3

App Provider

Sends the request to its IPS participant.

Payer IPS
Participant

IPS participant forwards request to the IPS Switch to
retrieve Payee details.

4

IPS Switch

If a short form alias is involved, the switch requests the
alias directory to provide the payee’s long form alias.

5

6

7

8

9

Alias
Directory

The Alias Directory returns the full form handle of the
payee to the switch.

IPS Switch

The IPS switch routes the request to the Payee SoV
Participant.

Payee SoV
Provider

The Payee SoV Participant returns the Payee details (full
name and surname, SoV details etc.) to the IPS switch.

IPS Switch

The IPS switch routes the provided Payee details to the
Payer’s IPS participant for the Payer to confirm that
they are paying the intended Payee.

Payer SoV
Provider

The Payer Participant routes back the payee’s details to
the Payer’s Mobile App.

10

User

App Provider requests the User to confirm payee details
before making the credit transfer.

If it is the incorrect
details, user starts the
process over again.

End of use case

Table 21: Use case ID IPP-UC101

Classification: Confidential

72

12.1.2. Credit Transfer

The second step is the credit transfer which is only initiated after the beneficiary’s details are

verified and it is confirmed that there is no derogatory status on the beneficiary’s store of value.

A credit transfer can be initiated through a mobile application of the IPSP or on the central USSD.

IPSPs may enable pre-approved credit transfer on internet banking. A credit transfer can involve

3 participants i.e., a Payer IPSP that is providing the Mobile Application (who can be different

from the Remitter SOV provider), the Remitter SOV provider (who has the User’s store of value),

and the beneficiary SOV provider. The Payer IPSP can also be the Remitter SOV provider, if such

an IPSP is licensed to provide users with store of value facilities i.e., bank accounts and/or e-

money wallets.

Use Case ID

IPP-UC102

Use Case Name:

Send Money: Credit transfer from one SoV Provider to another SoV
Provider

Use Case
Description:

This use case describes how a payer initiates a credit transfer through a
mobile number from the payer SoV Provider directly to payee SoV
Provider

End Objective:

The payee receives the credit transfer

Primary Actors:

• Payer
• Payee

Secondary Actors

• Payer SoV Provider
• Payee SoV Provider

Trigger Event:

The mobile number inserted by the payer is verified and the payer initiates
a credit transfer to the mobile number

IPS Switch Business Rules

1.  Both payer and payee registered on IPS.

2.  Payee not blacklisted.

3.  The payee’s mobile number should have been linked to an active full form alias.

Classification: Confidential

73

IPS Participant Business Rules

1.  Beneficiary should receive a notification from their SoV Provider to which their mobile

number (used in the payment process) is linked to their full form alias construct.

Basic Flow

Figure 18: Credit Transfer

Actors

Action

Step
ID

1

Payer

Payer confirms Payee details using their preferred IPS
channel and initiates the payment

2

3

Mobile App
Provider

Forwards the payment request to its IPS Participant

Payer’s
Participant

IPS

ReqPay – The Payer’s IPS Participant initiates the credit
transfer by sending the request to the IPS switch

4

IPS Switch

ReqAuthDetail – The IPS switch validates that the Payee
details are still active at the Payee Participant

Notes and references

The User should first
enter their IPS pin
before they can
access the various IPS
services. The 2-factor
authentication will
therefore be required
before a payment is
made.

This API seeks to
check whether payee
alias exists and valid
(can receive funds)

Classification: Confidential

74

5

6

7

8

9

Payee SoV
Provider

RespAuthDetail – The Payee Participant confirms that
the Payee details are still active

IPS Switch

ReqPay Debit – The IPS switch sends a request to the
Payer SoV Participant to debit the Payer’s SoV

Payer SoV
Provider

RespPay Debit – The Payer SoV Participant confirms
that the Payer SoV has been debited

IPS Switch

ReqPay Credit - The IPS switch sends a request to the
Payee SoV provider to credit the Payee’s SoV

Payee SoV
Provider

RespPay Credit - The Payee SoV provider confirms that
the Payee SoV has been credited

10

IPS Switch

ReqTxnConfirmation – Following receipt of the ResPay,
the IPS switch provides the Payer’s IPS Participant with
the confirmation that the respective Payer and Payee
SoVs have been debited and credited accordingly

.

11

12

Payer’s
Participant

IPS

Payer Debit Notification – The Payer SoV Provider
provides the Payer with a notification that their SoV has
been debited

Mobile App
Provider

Provides payer with confirmation of successful credit
transfer

13

IPS Switch

Requests the payee SoV provider to confirm
transaction

Payee SoV
Provider

RespTxnConfirmation - The Payee SoV provider
provides the IPS switch with a confirmation that the
Payee has received a notification of the credit to their
SoV

Payee SoV
Provider

Provide payee with a notification that their store of
value has been credited

14

15

End of use case

Table 22: Use case ID IPP-UC102

Classification: Confidential

75

12.2.

USSD P2P Transaction: Send Money

Use Case ID

IPP-UC103

Use Case Name:

USSD P2P payment

Use Case Description:

In this use case, the user makes a credit transfer through the central USSD channel

End Objective:

User makes a credit transfer

Primary Actors:

• User
• USSD Gateway Provider

Secondary Actors

• User SoV Provider
• MNO

Trigger Event:

A user opens the IPS central USSD channel to make a payment

IPS Switch Business Rules

Basic Flow

Figure 19: USSD P2P transaction: send money

Classification: Confidential

76

Step
ID

Actors

Action

Notes and references

1

2

3

4

5

6

7

8

User

USSD
Gateway
(PSP)

User

USSD
Gateway
(PSP)

The user enters USSD code (e.g., 140\*140#) on his
phone.

The application server responds back with a menu list.

User then selects "Send money" from the list of menu
options.

Returns various options to send money

User

Selects to send money to a mobile number

USSD
Gateway
(PSP)

Requests User to enter mobile number

User

Enters mobile number of beneficiary

USSD
Gateway
(PSP)

Sends mobile number to IPS switch

9

IPS

Resolves mobile number in alias directory and sends
request to beneficiary SoV Provider to provide payee
details

10

Beneficiary
SoV Provider

Returns beneficiary information to IPS switch

11

IPS

12

USSD
Gateway
(PSP)

Returns payee details to USSD gateway and requests
user to enter amount

Requests user to enter amount by also displaying payee
details

13

User

Checks payee details and enters amount

Classification: Confidential

77

14

USSD
Gateway
(PSP)

Requests User to enter IPS PIN

15

User

Enters PIN and Reqpay will be initiated

16

USSD
Gateway
(PSP)

17

IPS

Initiates Reqpay to the IPS

Initiates a request to the Beneficiary SOV provider to
authenticate payee details and account status

18

Beneficiary
SOV Provider

Provides a positive response

19

IPS

Initiates ReqPay Debit to the Remitter SoV Provider

20

Remitter SOV
Provider

Responds with a RespPay Debit to the IPS

21

IPS

Initiates a ReqPay Credit to the Beneficiary SOV Provider

22

Beneficiary
SOV Provider

Responds with a ResPay Credit to the IPS

Provides a transaction success confirmation to the USSD
Gateway

Provides a transaction success confirmation to the User

Provides a transaction success confirmation to both
Remitter and Beneficiary SOV Providers

Provides Payee with a credit notification

23

IPS

24

USSD
Gateway
(PSP)

25

IPS

26

Beneficiary
SOV Provider

End of use case

Table 23: Use case ID IPP-UC103

Classification: Confidential

78

12.3.

P2B/M Transactions (Mobile App)

In this use case, the user makes a credit transfer to a merchant or business. Take note that the
terms are used interchangeably. The payment can be initiated through the payer’s IPSP or SoV
provider. All P2M transactions initiated through the IPS switch (rail) should be completed on the
IPS switch, including on-us P2M transactions.

Use Case ID

IPP-UC201

Use Case Name:

Making a payment to a business or a merchant

Use Case Description:

The payer through a Mobile Application makes a payment to a merchant by
scanning a QR code, entering the merchant’s unique ID or long alias.

End Objective:

Business / Merchant receives the payment

Primary Actors:

• Payer
• Merchant

Secondary Actors

• SoV Provider

Trigger Event:

The payer initiates a payment to the merchant

IPS Switch Business Rules

1.  Merchant or business does not apply to sole trader, they are covered under P2P Transactions.

2.  Merchant QR payments should be enabled and should be different from the QR being used for cash-

out.

3.  Merchant ID should be enabled both short form and full form.

4.  For full form, it can be alpha numeric between 15 to 20 characters.

5.  For short form it will be a numeric 8 digit.

IPS Participant Business Rules

Classification: Confidential

79

1. The merchant is onboarded and has an IPS alias.

2.  The merchant has a Static QR code which is presented to the payer.

3.  The merchant is loaded onto the SoV Provider’s mobile application as a beneficiary.

4.  The merchant has a merchant ID that can be used to receive payments from the USSD channel.

Basic Flow

Figure 20: P2B / M Transactions: Make a payment

Step
ID

Actors

Action

1

Payer

Initiates a credit payment on the Enabler or SoV
Provider application, scanning the QR code or central
USSD channel.

Notes and references

The User should first
enter their
IPS pin
before they can access
the
IPS
various
services. The 2-factor
authentication
will
therefore be required
before a payment is
made.

2

3

4

Mobile App
Provider

IPS
Participant

IPS Switch

Routes a request pay to its IPS Participant.

Routes a request pay to the IPS switch.

Routes the transaction to the merchant’s SoV Provider
for
using
authorisation of merchant details.

the @handle provided

requesting

Classification: Confidential

80

5

6

7

8

9

Merchant’s
SoV Provider

Returns merchant details to the IPS switch with
merchant’s SoV good standing status.

IPS Switch

Requests the Payer’s SoV provider to debit Payer’s SoV.

Payer
Provider

SoV

Responds to the request and debits payer’s SoV.

IPS Switch

Requests the Merchant’s SoV Provider to credit the
merchant’s SoV.

Merchant’s
SoV Provider

Provides response to the IPS switch that the Merchant’s
SoV is credit.

10

IPS Switch

Informs payer’s IPS participant that the payer has been
debited and a credit to the Merchant’s SoV provider has
been made.

11

12

Payer
Participant

IPS

Sends transaction status to the Payer Mobile App
Provider.

Payer Mobile
App Provider

Provider payer with confirmation of successful credit
transfer.

13

IPS Switch

Informs Merchant IPS participant that the merchant has
been credited and the payer has been debited.

14

15

Merchant IPS
Participant

Merchant IPS
Participant

End of use case

Provides transaction confirmation to the IPS switch.

Informs merchant of successful credit transfer.

Table 24: Use case ID IPP-UC201

Classification: Confidential

81

12.4.

USSD P2M Transaction: Merchant payment

Use Case ID

IPP-UC202

Use Case Name:

USSD P2M payment

Use Case Description:

In this use case, the user pays a merchant through the central USSD channel

End Objective:

User makes a merchant payment

Primary Actors:

• User
• USSD Gateway Provider

Secondary Actors

• User SoV Provider
• MNO

Trigger Event:

A user opens the IPS central USSD channel to pay a merchant

IPS Switch Business Rules

Basic Flow

Classification: Confidential

82

Figure 21: Merchant payment USSD

Step
ID

Actors

Action

Notes and references

1

2

3

4

5

6

7

User

USSD
Gateway
(PSP)

User

USSD
Gateway
(PSP)

The user enters USSD code (e.g., 140\*140#) on his
phone.

The application server responds back with a menu list.

User then selects Merchant payment from the list of
menu options.

Returns various options to payment merchant

User

Selects to pay merchant using merchant ID

USSD
Gateway
(PSP)

Requests User to enter Merchant ID

User

Enters Merchant ID

Classification: Confidential

83

8

USSD
Gateway
(PSP)

9

IPS

Sends Merchant ID to IPS switch

Resolves Merchant ID in alias directory and sends
request to beneficiary SoV Provider to provide payee
details

10

Beneficiary
SoV Provider

Returns beneficiary information to IPS switch

11

IPS

12

USSD
Gateway
(PSP)

Returns payee details to USSD gateway and requests
user to enter amount

Requests user to enter amount by also displaying payee
details

13

User

Checks payee details and enters amount

14

USSD
Gateway
(PSP)

Requests User to enter IPS PIN

15

User

Enters PIN and Reqpay will be initiated

16

USSD
Gateway
(PSP)

17

IPS

Initiates Reqpay to the IPS

Initiates a request to the Beneficiary SOV provider to
authenticate payee details and account status

18

Beneficiary
SOV Provider

Provides a positive response

19

IPS

Initiates ReqPay Debit to the Remitter SoV Provider

20

Remitter SOV
Provider

Responds with a RespPay Debit to the IPS

21

IPS

Initiates a ReqPay Credit to the Beneficiary SOV Provider

22

Beneficiary
SOV Provider

Responds with a ResPay Credit to the IPS

Classification: Confidential

84

Provides a transaction success confirmation to the USSD
Gateway

Provides a transaction success confirmation to the User

Provides a transaction success confirmation to both
Remitter and Beneficiary SOV Providers

Provides Payee with a credit notification

23

IPS

24

USSD
Gateway
(PSP)

25

IPS

26

Beneficiary
SOV Provider

End of use case

Table 25: Use case ID IPP-UC202

12.5.

B/G2P Transactions: Bulk Payment

For B/G2P bulk payments, the beneficiary details are shared with Payer IPSP / BON and the IPSPS

or BON will perform a one-time debit of the total amount (outside of IPS), generate a reference

and send individual credit request to the IPS switch to credit multiple beneficiaries. These

payments are preapproved.

Use Case ID

IPP-UC301

Use Case Name:

Government or business bulk payments to persons

Use Case Description:

In this use case, the government makes a bulk payment to multiple persons.
These payments can comprise of grants, pension payouts or salaries. Similar
use case for merchants that intend to make bulk payments i.e., salaries. This is
a one-to-many use case

End Objective:

Multiple persons receive payment

Primary Actors:

• CMBO as Government’s IPS participant.
• Merchant to use Store of Value Provider as IPSP

Secondary Actors

Multiple payees

Classification: Confidential

85

Trigger Event:

Government triggers a bulk payment credit transfer

IPS Participant Business Rules

1.  Government / business can share the bulk processing file in the pre-defined format to the bank /

processing entity where Government / Business holds a SoV.

2.  The IPS switch needs confirmation of the bulk debit by the acquiring PSP on the SoV of the merchant,

(the details of the same shall be provided in the pay request) as a prerequisite to issuing the credit

instruction.

3.  The Payer SOV Participant and Payer IPS participant has to be the same entity.

4.  The Beneficiary SOV Participant must be on-boarded on IPS to avail the service.

5.  The Participant then:

a. Performs debit on the business / government SoV (the process of debit is based on the

arrangements with banks and government / business). Also, this type of transactions is pre-

authorised debit and shall not require PIN authentication.

b. The CMBO or a participant de-bulk the file and sends the individual transaction requests to

the IPS switch.

6.  Subsequently, the IPS switch will send a payment request (ReqPay Credit) to the beneficiary’s IPSP to

credit each beneficiary.

7.

IFSC code and account number combination, resolved directly by IPS, is represented as account-

no@ifsc-code.ifsc.npci (e.g. 12345678901@BWLI0483772.ifsc.npci)

8.  SoV provider needs to pass above in the address field ReqPay request to IPS.

9.  Debit / Debit reversal is outside the scope of IPS in this use-case (as there is no Debit request to IPS).

10. In case of a pre-approved transaction failing to credit the beneficiary, the relevant response code will

be provided. It is the responsibility of the Payer IPS Participant to handle the reversal of the

transaction.

11. In case of credit timeout, transaction will be settled in the next settlement cycle.

CMBO / Merchant Business Rules

1.  The platform used to initiate the payment instructions is to be determined by CMBO or the payer IPSP.

Classification: Confidential

86

2. The debulking and scheduling of recurring payments is to be performed by the CMBO / merchant IPS

participant prior to being sent to the IPS switch which only processes payments individually (i.e. not

batched).

3.  The CMBO / Merchant and their IPS participants are to determine their arrangement of when the bulk

debit of the Government account or merchant's SoV is to take place. The only requirement is for this

confirmation to be provided by the time of the crediting of the beneficiary’s SoV.

4.  Payer IPSP is to receive the Payee details (account or wallet number plus IFSC) associated with the

alias being paid prior to the crediting of the payee’s SoV. This pre-authorisation should be done prior

to submitting the bulk payment file.

5.  The Payer and Payee IPSP are to issue payment confirmations to the merchant and beneficiary

respectively to confirm the successful transaction. The merchant may receive a bulk payment

notification.

Basic Flow

Figure 22: Bulk payment

Step
ID

Actors

Action

Notes and references

Classification: Confidential

87

So ParticipantIPS3RespPayCreditReqPayCredit25ReqPayRespPay1Beneficiary detailsshared with Payer IPSParticipant / BON andBON will perform aone time debit of thetotal amount (outsideof IPS) and send anindividual request toIPS for credit o ernment enc Merchant IPSP6Paymentstatusnotification toGovernment AgencyFunctional ow: G2P (Bulk Payment Use Case)IPS unctiona o u Pa mentCredit rans er So Participant4

Government /
Merchant
/
IPSP

Prepares the files and share it with the respective SOV
participant (or CMBO for Government payments) for
Debit.

Government /
Merchant
/
IPSP

IPS Switch

Debit the amount and share the Credit request to IPS.

Upon receiving the ReqPay request from SoV
participant, IPS will initiate the credit request to
respective SoV Participants for Credit.

Payee
participants

Responds to the IPS Switch through RespPay and
credit the beneficiary account.

1

2

3

4

End of use case

Table 26: Use case ID IPP-UC301

12.6. Merchant Cash-Out (Mobile App)

Use Case ID

IPP-UC401

Use Case Name:

Merchant cash out

Use Case Description:

In this use case, the user can perform a cash out operation by scanning the
merchant’s QR code, or making a payment to a merchant’s unique code, or long
alias.

End Objective:

Merchant dispenses cash

Primary Actors:

• Merchant
• User

Secondary Actors

• Merchant SoV Provider /
• User SoV Provider

Trigger Event:

A user approaches the merchant till and request to cash out from their SoV

IPS Participant Business Rules

Classification: Confidential

88

1. The user approaches the merchant then scans their QR code or enters their merchant ID or long alias.

2.  The user needs to complete the user journey before any action can commence from the merchant

3.  The Merchant’s QR code for cash-out should be different from the QR code used to make a payment

to the merchant.

Post-conditions

Basic Flow

Figure 23: Merchant Cash-Out

Step
ID

Actors

Action

Notes and references

1

User

Initiates a cash out request by providing merchant
details through one of the supported identifiers QR
Code (App only), Long Handle, or Unique Code. The
Merchant captures the request via Mobile App.

Which is treated as a
payment
the
merchant.

to

Payer Mobile
App/USSD
Provider

IPS
participant

Submits a payment request to the IPS participant.

Initiates a request to authorise the merchant’s details.

IPS Switch

Passes on the request to the Merchant’s IPS participant.

2

3

4

Classification: Confidential

89

5

6

7

8

9

Merchant IPS
participant

Responds with authorisation of the merchant details.

IPS Switch

Requests for the user’s store of value to be debited.

Remitter
bank

Response with confirmation that the store of value is
debited.

IPS Switch

Requests beneficiary store of value provider to credit
merchant.

Beneficiary
bank

Beneficiary bank responds that merchant’s store of
value is credited.

10

IPS Switch

Provides payer IPS participant with confirmation that
payment was successful.

11

12

Payer
participant

IPS

Informs the Mobile App/USSD Provider that payment
was successful.

Payer Store
of
Value
Provider

Informs the user that store of value has been debited
and cash will be dispensed by the merchant.

13

Merchant

Hands over cash to user.

End of use case

Table 27: Use case ID IPP-UC401

Once a credit
notification has been
received from the
beneficiary bank or
IPS participant.

Classification: Confidential

90

12.7.

USSD Merchant Cash-out Transaction

Use Case ID

IPP-UC402

Use Case Name:

USSD MCO

Use Case Description:

In this use case, the user pays a merchant to get cash from the Till

End Objective:

User receives cash

Primary Actors:

• User
• USSD Gateway Provider

Secondary Actors

• User SoV Provider
• MNO

Trigger Event:

A user opens the IPS central USSD channel to cash-out at a merchant

IPS Switch Business Rules

Basic Flow

Classification: Confidential

91

Figure 24: Cashout at merchant (USSD)

Step
ID

Actors

Action

Notes and references

1

2

3

4

5

6

7

User

USSD
Gateway
(PSP)

User

USSD
Gateway
(PSP)

The user enters USSD code (e.g., 140\*140#) on his
phone.

The application server responds back with a menu list.

User then selects cash-out at merchant from the list of
menu options.

Returns various options to cash-out at merchant

User

Selects to cash-out at merchant using merchant ID

USSD
Gateway
(PSP)

Requests User to enter Merchant ID

User

Enters Merchant ID

Classification: Confidential

92

8

USSD
Gateway
(PSP)

9

IPS

Sends Merchant ID to IPS switch

Resolves Merchant ID in alias directory and sends
request to beneficiary SoV Provider to provide payee
details

10

Beneficiary
SoV Provider

Returns beneficiary information to IPS switch

11

IPS

12

USSD
Gateway
(PSP)

Returns payee details to USSD gateway and requests
user to enter amount

Requests user to enter amount by also displaying payee
details

13

User

Checks payee details and enters amount

14

USSD
Gateway
(PSP)

Requests User to enter IPS PIN

15

User

Enters PIN and Reqpay will be initiated

16

USSD
Gateway
(PSP)

17

IPS

Initiates Reqpay to the IPS

Initiates a request to the Beneficiary SOV provider to
authenticate payee details and account status

18

Beneficiary
SOV Provider

Provides a positive response

19

IPS

Initiates ReqPay Debit to the Remitter SoV Provider

20

Remitter SOV
Provider

Responds with a RespPay Debit to the IPS

21

IPS

Initiates a ReqPay Credit to the Beneficiary SOV Provider

22

Beneficiary
SOV Provider

Responds with a ResPay Credit to the IPS

Classification: Confidential

93

23

IPS

24

USSD
Gateway
(PSP)

25

IPS

Provides a transaction success confirmation to the USSD
Gateway

Provides a transaction success confirmation to the User

Provides a transaction success confirmation to both
Remitter and Beneficiary SOV Providers

26

Beneficiary
SOV Provider

Provides Payee with a credit notification

27

Merchant

Hands over cash to the user

End of use case

Table 28: Use case ID IPP-UC402

12.8. Merchant Cash-In (Mobile App)

Use Case ID

IPP-UC501

Use Case Name:

Merchant cash in

Use Case Description:

In this use case, a User approaches a merchant with cash and request to cash-in
their store of value (account or wallet). The Merchant can initiate the transaction
through their mobile application, merchant application or Till. The merchant can
pay to a user’s mobile number, long alias or by scanning the User’s QR code.

End Objective:

User SoV is credited

Primary Actors:

• Merchant
• User

Secondary Actors

• Merchant SoV Provider /
• User SoV Provider

Classification: Confidential

94

Trigger Event:

Basic Flow

A user approaches the merchant till and request to cash in to their SoV providing
their alias (Mobile Number, Long Handle, or QR Code).

Figure 25: Merchant Cash-In

Step
ID

Actors

Action

Notes and
references

1

2

3

4

5

6

7

Merchant

Receives cash and initiates a payments to the customer.

Merchant
Acquirer

IPS
participant

Forward the payment request to the IPS participant.

Initiates reqpay to the IPS switch

IPS Switch

IPS switch requests the User’s store of value provider to verify payee
details

Payee
Provider

SoV

Returns verification to the IPS switch

IPS switch

Sends debit request to payer SoV

Payer
Provider

SoV

Payer SoV Provider debits the amount and responds back to IPS.

Classification: Confidential

95

8

9

IPS Switch

IPS sends the credit request to the beneficiary’s SoV Provider via
ResPay Credit Api

Merchant
SoV Provider

Beneficiary SoV is credited and sends back the response to IPS.

10

IPS Switch

IPS send the credit notification to Payer IPS participant via Txn
Confirmation API

11

12

Payer
participant

IPS

Merchant
Acquirer

Sends transaction status to the merchant’s acquirer

Provider merchant with successful credit transfer

13

IPS Switch

Request transaction confirmation from the Payee’s IPS participant

14

15

Pa ee’s
participant

IPS

Pa ee’s
participant

IPS

End of use case

Provides confirmation to the IPS switch

Informs the payee that their store of value has been credited

Table 29: Use case ID IPP-UC501

12.9.

USSD Merchant Cash-In Transaction

Use Case ID

IPP-UC502

Use Case Name:

USSD MCI

Use Case Description:

In this use case, the merchant pays a User through the USSD channel after receiving
cash from the User

End Objective:

User’s SOV is credited

Primary Actors:

• Merchant
• USSD Gateway Provider

Secondary Actors

• Merchant SoV Provider

Classification: Confidential

96

• MNO

Trigger Event:

A User approaches the merchant with cash to cash-in to their SOV

IPS Switch Business Rules

Basic Flow

Figure 26: Cashin at merchant (USSD)

Step
ID

Actors

Action

Notes and references

1

2

3

4

Merchant

USSD
Gateway
(PSP)

Merchant

USSD
Gateway
(PSP)

The merchant enters USSD code (e.g., 140\*140#) on his
phone.

The application server responds back with a menu list.

Merchant then selects cash-in at merchant from the list
of menu options.

Returns various options to cash-in at merchant

Classification: Confidential

97

5

6

7

8

9

Merchant

USSD
Gateway
(PSP)

Selects to cash-in at merchant using User’s mobile
number

Requests Merchant to enter User mobile number

Merchant

Enters User’s mobile number

USSD
Gateway
(PSP)

IPS

Sends User’s mobile number to IPS switch

Resolves User’s mobile number in alias directory and
sends request to beneficiary SoV Provider to provide
payee details

10

Beneficiary
SoV Provider

Returns beneficiary information to IPS switch

11

IPS

12

USSD
Gateway
(PSP)

Returns payee details to USSD gateway and requests
Merchant to enter amount

Requests user to enter amount by also displaying payee
details

13

Merchant

Checks payee details and enters amount

14

USSD
Gateway
(PSP)

Requests Merchant to enter IPS PIN

15

Merchant

Enters PIN and Reqpay will be initiated

16

USSD
Gateway
(PSP)

17

IPS

Initiates Reqpay to the IPS

Initiates a request to the Beneficiary SOV provider to
authenticate payee details and account status

18

Beneficiary
SOV Provider

Provides a positive response

19

IPS

Initiates ReqPay Debit to the Remitter SoV Provider

Classification: Confidential

98

20

Remitter SOV
Provider

Responds with a RespPay Debit to the IPS

21

IPS

Initiates a ReqPay Credit to the Beneficiary SOV Provider

22

Beneficiary
SOV Provider

Responds with a ResPay Credit to the IPS

Provides a transaction success confirmation to the USSD
Gateway

Provides a transaction success confirmation to the User

Provides a transaction success confirmation to both
Remitter and Beneficiary SOV Providers

Provides Payee with a credit notification

23

IPS

24

USSD
Gateway
(PSP)

25

IPS

26

Beneficiary
SOV Provider

End of use case

Table 30: Use case ID IPP-UC502

12.10. ATM Cash-out

Use Case ID

IPP-UC601

Use Case Name:

Cashing out at an ATM

Use Case Description:

In this use case, the user approaches an interoperable ATM and initiates a cash
withdrawal using their mobile application or USSD

End Objective:

Interoperable ATM dispenses cash

Primary Actors:

User

Classification: Confidential

99

Secondary Actors

• ATM Provider
• User SoV Provider

Trigger Event:

The User selects the option to withdraw cash at an interoperable ATM

IPS Switch Business Rules

1.  QR Code withdrawals are not activated for go-live.

2.  Details around specific of non-financial (validation/verification) and financial (Debit/Credit/Reversal) leg

of the transactions will be covered as a part of TSD.

3.  The mobile number entered by the user at the ATM (step #5) is the same number that is linked to the SoV

against which the withdrawal OTP is requested (step #1).

ATM Provider Business Rules

1.  User pre-stages before engaging the ATM including entering their IPS pin on the mobile device.

2.  ATM withdrawal amount / denomination to be selected by the User on the channel before approaching

the ATM. If the denomination is not available, the amount cannot be withdrawn.

3.  Partial withdrawal is not in scope.

4.

If currency note is not dispensed, then full reversal will be triggered by the ATM Acquirer

5.  Transaction once completed, ATM provider and SoV participants will notify the user with the appropriate

status of the transaction.

6.  The implementation of ATM ISO message conversion to UPI message standard and vice versa will have to

be managed by ATM acquiring banks.

7.  This implementation requires that payee IPS Participant and Beneficiary ATM owning bank are the same

entity.

8.  Generation of OTP and storing the relevant user information is performed by SoV participants. IPS switch

is not involved in this process

9.  The mobile number entered by the user at the ATM is the same number that is linked to the SoV against

which the withdrawal OTP is requested.

10. SoV participants performs the auto reversal / releases block of funds, if OTP is not utilized within the

stipulated time. Similarly, in an event ATM is not able to dispense the cash, ATM acquiring PSP must

respond with failure response code for IPS switch to initiate the reversal request to SoV participant.

Classification: Confidential

100

Similarly, the successful response from ATM acquiring PSP shall only be after the cash is dispensed from

the ATM.

11. Transaction once completed, ATM Provider and SoV participants will notify the user with the appropriate

status of the transaction.

12. Details around specific non-financial (validation/verification) and financial (debit/credit/reversal) leg of

the transactions will be covered as a part of TSD.

13. The security (encryption, certificates, SSL etc.) mechanism for data exchange between ATM provider and

ATM Acquirer is out of scope of IPS.

14. The security (encryption, certificates, SSL etc.) mechanism for data exchange between IPS and ATM

Acquirer must be as per the IPS specification.

15. Cashing out at an ATM is only applicable to e-money wallets. Bank accounts are out of scope.

Basic Flow

Figure 27: ATM Cash-out

Step ID

Actors

Action

Notes and references

Classification: Confidential

101

O ce Use Only Internal unctiona o M ithdra a (Success o 20 )A user wants to withdraw cash from an ATM using an OTP (Overall Flow)CustomerSo Participant IPSS itch ias irector M c uirer MStartOpen channel withthe preferred SoVparticipant, entersamount, Pin andrequests OTPGenerates an OTP oncustomer registeredmobile no and blockthe funds.stores theamount, OTPand mobile no.Begins the OTPexpiration timerReceives the OTP forwithdrawal with the validityperiod and visits to an ATMto enter the details123Customer Initiatesthe Withdrawprocess by enteringMobile No, WalletPin, OTP andAmount5ValidationPassed NoReceives details andinitiates the validationrequest to SOV participantYesSends response toATM Acquirer IPSprovider forappropriate actionusingrespaydebitIPS participantreceivesrespaydebitand Sendsreqpaycredit to ATM acquirerInforms the Customer that thedetails provided were incorrect orverification failed16YesNoDenominationavailable atATM 6 Reqtxnconfirmation toPayer IPS24Receives the cashReceives errormessageTransactionEnds 6 EndEnd MPro iderReceived details is sentto internal system forfurtherverification(OTP, PIN,Amount and OTP Expiry)including the check forthe availability of thefunds in customerSoV1413 Sends response toATM forappropriate action15ATM acquirerreceives thereqpaycreditrequestATM providesacknowledgment ofcash dispenseand ATM acquirercredits pool accountATM acquirerresponds withrespaycreditSendsReqPayrequest with OTPand Wallet Pinrequest to IPSSwitch participant8IPS initiatesReqauthwith SOV participantalong with directory9SOV responds withrespauth(Verification of FullAlias and provideAccount detailsrelated to thesame.)InitiatesreqdebitRespayDebits thecustomer SOVand provideresponsethroughrespaydebit17restxnconfirmationATM initiates cashdispense and respondswith status Success1012192326222520End4172118713 NoEnd11 Failure20 20 20C

/

Customer choose the
amount he
she
wishes to withdraw,
exceeding
not
N$2000.00

Step number 6 is
optional and its
discretion of ATM
provider to
implement the same.
ATM provider can skip
the step and decline
the transaction at
step number 20 with
appropriate error
codes.

1

2

3

4

5

Customer

Open channel with the preferred SoV participant,
enters amount, Pin and requests OTP

Customer
SoV Provider

Generates an OTP on customer registered mobile no
and block the funds.

Customer
SoV Provider

Stores the amount, OTP and mobile no. Begins the OTP
expiration timer

Customer

Receives the OTP for withdrawal with the validity
period and visits to an ATM to enter the details

ATM Provider

Customer Initiates the Withdraw process by entering
Mobile No, Wallet Pin, OTP and Amount

6a

ATM Provider Denomination available at ATM?

7

8

9

10

ATM Provider

If yes, receives details and initiates the validation
request to SOV participant.

ATM Acquirer

Sends ReqPay request with OTP and Wallet Pin request
to IPS Switch participant.

IPS Switch +
Alias
Directory

Customer
SoV
participant

initiates reqauth with SOV participant after fetching full
alias mapped to mobile number in directory.

SOV responds with respauth (Verification of Full Alias
and provide Account details related to the same.)

11

IPS Switch

Initiates reqdebit

Classification: Confidential

102

Approaches:

1.  SOV participants
    can block the fund
    (at step 2) and
    need not validate
    the funds as the
    same have been
    reserved (at step

12)

2.  SOV participants
    can block the fund
    (at step 2) and
    need not validate
    the funds as the
    same have been
    reserved (at step

12)

3.  SOV participants
    can block the fund
    (at step 2) and
    need not validate
    the funds as the
    same have been
    reserved (at step

12)

12

Customer
SoV
Participant

Received details is sent to internal system for further
verification (OTP, PIN, Amount and OTP Expiry)
including the check for the availability of the funds in
customer SoV.

13B

17

18

19

Customer
SoV
Participant

Customer
SOV
Participant

IPS Switch

Validation passed

Debits the customer SOV and provide response through
respay debit

IPS Switch receives respay debit and sends reqpay
credit to ATM acquirer

ATM Acquirer ATM acquirer receives the reqpay credit request

Classification: Confidential

103

In Step 20, there shall
be two scenarios: 4. ATM will dispense
cash to the user.
In case of success
scenario, once the
cash is dispensed,
the ATM will
respond ATM
acquirer with
success status.
ATM acquirer will
respond with
success scenario
to IPS, and the
flow will proceed.
In case of failure,
the cash will not
be dispensed, and
the failure
response will be
provided to ATM
acquirer. In case
of failure IPS will
be responded
with credit failure
and debit
reversal\* will
happen.

5.

If ATM acquirer
doesn’t respond to
IPS switch with the
status of transaction,
the credit time-out\*
scenario will follow.

20

ATM Provider ATM initiates cash dispenses and responds with status.

20B

ATM Provider Success

21

Customer

Receives the case.

22

ATM Acquirer

ATM provides acknowledgment of cash dispense
and ATM acquirer credits pool account

23

IPS Switch

ATM acquirer responds with respay credit

Classification: Confidential

104

24

25

26

Customer
SoV
Participant

Reqtxn confirmation to Payer IPS

ATM Acquirer Respay

IPS Switch

Restxnconfirmation

Negative response

13A

14

15

16

17

Customer
SoV
Participant

IPS Switch

Validation failed.

Sends response to ATM Acquirer IPS provider for
appropriate action using respay debit

ATM Acquirer Sends response to ATM for appropriate action

ATM Provider

Informs the Customer that the details provided were
incorrect or verification failed

Customer

Receives error message

End

ATM flow additional notes:

1.  Steps 12, 13,14 and 17 in the flow are a single step at the SOV participants end. Once SOV participants
    receive details (step 12), he will validate those details and will either approve and respond with respay
    debit success (step 13B, 17) or reject and respond with respay debit failure (step 13A,14)

End of use case

Table 31: Use case ID IPP-UC601

Debit Reversal and Deemed Process – (#20A)

1.  Debit Reversal:

I.

II.

III.

If Bene/Acquirer PSP send failure response to IPS switch, IPS switch will initiate debit reversal
to Issuing bank (Payer IPS Participant).

If debit reversal is Success then transaction is closed.

If debit reversal is failed then transaction will go in deemed and will require to get settled
manually in next settlement cycle.

2.  Credit time out:

Classification: Confidential

105

I.

If Bene/Acquire PSP is unable to send any response to IPS switch,

a)

IPS switch will initiate ReqChkTxn to Bene/Acquire PSP

o

o

If ReqChkTxn response is Credit Success then the transaction is complete and
rest of the steps as per the flow shall be followed.

If Bene/Acquire PSP is unable to respond to ReqChkTxn then IPS will initiate
ReqPay Credit Reversal.

➢

If Credit Reversal response is

o Original Credit Success: No further actions and rest of the

steps as per the flow shall be followed.

o Original Credit Fail: Transaction will fall under Debit Reversal

Flow.

o Unable to send Credit Reversal response: Transaction will be
marked as deemed and will require to get settled in the next
settlement cycle.

3.  Credit Failure:

I.

II.

If ATM responds with failure to dispense cash, ATM acquirer will respond to IPS switch with
failure.

The IPS switch will respond with reqpay debit reversal (Step 1 above) to the remitter bank
(Payer IPS participant) and the remitter shall reverse the transaction.

Note: It is recommended that, OTP once consumed shall not be allowed to use again, irrespective of the status
of the transaction, when it was used.

Classification: Confidential

106

13. NEGATIVE SCENARIOS

This section provides for the plausible negative solution on the IPS covering both scenarios during

registration and during a transaction. While the coverage is not exhaustive, the Technical

Specifications will make provision for all plausible scenarios.

13.1.

Registration Negative Scenarios

13.1.1. Negative Scenarios

There are possible negative scenarios that could occur during registration and deregistration of

an alias. Some of these scenarios can be summarized as follows:

a) Failure to register / deregister due to technical

issues / restrictions

from

the IPS Participant:

i. Registration of a new IPS customer is temporary blocked by IPS Participant due to

maximum number of attempts exceeded by the user.

ii. User may not be able to register their default alias due to the IPS Participant having a

technical issue resulting in failure to route the request to the centralised alias

directory.

iii. IPS participant is unable to match debit card number and pin to the store of value of

the user.

iv. IPS participant is unable to verify User’s identity at the Mobile Network Operator’s

database.

b) Failure to register / deregister due to technical issues /restrictions from the Mobile

Network Operator:

i. Mobile number registration/ deregistration fails due to a technical error caused by an

MNO not being able to send OTP for verification.

ii. MNO unable to provide a respond to IPS participant’s verification request.

Classification: Confidential

107

c) Failure to register / deregister due to technical issues / restrictions from the Ministry of

Home Affairs:

i. Unable to verify User’s identity.

ii. Unable to provide a user verification response to the IPS participant.

d) Failure to register/ deregister due to technical issues /restrictions from IPS Switch:

i. User may not be able to register their customised name alias as it is currently

registered and belongs to another IPS user.

ii. A customised name alias may be rejected during registration due to it failing to meet

the guidelines for a customised name.

13.1.2. Resolution of potential negative scenarios

Resolutions for potential failures during registration are provided in the table below, although

the list is not exhaustive. The cause of actions provided are mandatory during registration. In all

the cases provided below, an error message is to be provided to the User on the channel they

are registering an Alias. In all the cases provided below, the SoV Provider of the User should be

contacted for action.

Cases

Course of Action

• User can make 3 attempts to register, there after a

cooling period will apply.

1.  Registration of a new IPS customer is

• Cooling period for User to re-attempt registration

temporary blocked by Participant due to

for:

maximum number of attempts exceeded

by the user.

o

o

o

the first time is 30min.

second time is 1 hour.

third time – contact SoV Provider for

assistance.

2.  User may not be able to register their

default alias due to the Participant having

a technical issue resulting in failure to

• The Participant informs the user of the technical

difficult and advises the user to retry again later.

Classification: Confidential

108

Cases

Course of Action

route the request to the centralised alias

• The user retries again

later until they have

directory.

successfully registered.

• Course of action in number 1 applies.

3.  Mobile

number

registration/

deregistration fails due to a technical error

caused by an MNO not able to send

verification.

• The user clicks on the option of resending the

verification.

If the problems persist the user

enquires. with the Participant customer care centre.

• The Participant informs the user that the selected

customised name

is already

registered and

4.  User may not be able to register their

recommends alternatives

to

the user. E.g.

customised name alias as it is currently

Carwash@PSPA

is

already

taken,

registered and belongs to another IPS user.

Carwash4ways@PSPA is available.

• The user registers a different customised name

successfully.

• The Participants informs the user of the guidelines

needed to be met E.g. A customised name may not

contain special characters.

• The user takes the guideline into considerations and

is able

to

register

their customised name

successfully.

5.  A customised name alias may be rejected

during registration due to it failing to meet

the guidelines for customised name.

Table 32: Resolution of potential negative scenarios

Classification: Confidential

109

13.2.

Transaction Negative Scenarios

The following table provides a list of possible exceptions and negative scenarios that can happen

during an instant payment transaction. The functional flows for some of these scenarios are

provided below. Some of the scenarios will be further deliberated in the Technical Specifications

and / or handled in accordance with the respective IPS participants’ internal procedures. The

following table provides a non-exhaustive list of negative scenarios related to an instant payment

transaction.

#

1

2

3

4

5

6

7

8

9

Flow Description

Payer fails to Pay due to general technical issue

Payer fails to Pay due to IPS payment transaction limit reached

Payer fails to Pay due to merchant SoV not accepting payments (frozen account, etc.)

Payer fails to Pay due to payment declined by Payer SoV Participant

Payer fails to Pay due to technical Issue at Payer SoV Participant

Payer fails to Pay due to Payer SoV Participant payment transaction limit reached

Payer fails to Pay due to wrong PIN entered

Payer fails to Pay due to sending to a blocked IPS Alias

Payer fails to Pay due to sending to an invalid SoV

10 Transaction fails due to Timeout Window lapsing

11 Transaction fails due to manual cancellation by user

12 Payer sends money to payee and payment is "deemed successful"

13 Payer sends money to payee and payment failed

Table 33: Transaction Negative Scenarios

Classification: Confidential

110

Failure Scenarios

This section explains how various failure scenarios are handled during the PAY transaction. The

transaction flows mentioned above will be considered while describing the failure scenarios.

Figure 28: Failure Scenarios

Failure at step 18 – Payer IPS Participant unable to notify the Payer:

In this scenario, when the payer IPS is not able to notify the end customer on the status of the

transaction, a mechanism must be put in place by the payer IPS participant to notify the customer

at a later stage. This can be achieved by the payer IPS participant reinitiating the notification

message to customer or by providing the customer an option to check the status of the

transaction through his application, or by providing a list of all transactions (with status) in the

application.

Classification: Confidential

111

Failure at step 16/17 - Response from IPS does not reach Payee/Payer IPS Participant:

In this scenario, when the response sent by IPS does not reach Payer/Payee IPS participant, the

participants should have a mechanism to initiate a Check Status API to know the status of the

transaction. The participant can only initiate the Check Status API to the IPS after a time of

Transaction expiry time. If no success response is received from beneficiary IPS Participant, then:

a) IPS will send check status after 10 seconds of the original credit request.

b) If no response for check status, then IPS will generate ReqPay Credit Reversal to bene bank.

c) If no response to step 2, the transaction will get in Deemed/Pending state which will be

settled the next day with either TCC/RET code (see code description below).

If there is response of credit reversal which is successfully reversed, then IPS will generate debit

reversal to remitter bank.

Failure at step 15 - Response from Payee participant does not reach the IPS:

In this scenario, when the response sent by Payee participant does not reach the IPS, this

transaction will be considered as deemed and will proceed for settlement. Response will be sent

to Payee and SoV Provider. Regardless of the status, the transaction will be settled offline in the

IPS Real Time Clearing and Settlement (IRCS).

Failure at step 15 - Declined Response from Payee participant to the IPS:

In this scenario, when the Payee participant responds with a declined response to the IPS, the IPS

will send the reversal request to Payer participant and respond to Payee and SoV Provider with a

declined response.

Failure at step 13 - Payee participant is not available to the IPS:

In this scenario, when the Payee participant is not available to the IPS, the IPS will send the

reversal request to Payer participant and respond to Payee and Payer participants with declined

response.

Classification: Confidential

112

Failure at step 12 - Declined Response from Payer participant to the IPS:

In this scenario, when the Payer participant responds with a declined response to the IPS, the IPS

will respond to Payee and Payer participants with declined response. No credit request will be

initiated to Payee participant.

Failure at step 12 - Response from Payer participant does not reach the IPS:

In this scenario, when the response sent by Payer participant does not reach the IPS, the IPS will

timeout the transaction. The IPS will respond to Payee/Payer participants with timeout response.

Failure at step 9 - Payer participant is not available to the IPS:

In this scenario, when the Payer bank is not available to IPS, the IPS will respond to Payee and

Payer participants with declined response.

Failure at step 8 - Declined Response from Payee participant to the IPS:

In this scenario, when the Payee participant responds with a declined response to the IPS, the IPS

will respond to Payer participant with declined response.

Failure at step 8 - Response from Payee participant does not reach the IPS:

In this scenario, when the response sent by Payee participant does not reach the IPS, the IPS will

wait for the response till the timeout period. Payee participant may have a mechanism to re send

the response within the timeout period. If the IPS does not receive response within the timeout

period, the IPS will timeout the transaction and respond to Payer participant with a timeout

response.

Classification: Confidential

113

Failure at step 6 – Payee participant is not available to the IPS:

In this scenario, when the Payee participant is not available to the IPS, the IPS will respond to

Payer participant with declined response.

Failure at step 5 – The IPS is not available to Payer participant:

In this scenario, when the IPS is not available to Payer participant, the Payer participant will have

a mechanism to re initiate the Pay request to the IPS. For a failed/declined preapproved

transaction remitter participant should reverse the debit on receiving the declined response from

the IPS.

13.3.

Error Codes

The response error codes of the IPS are documented in a separate document referred to as

Instant Payment Solution Error and Response Codes. The codes covered therein are as follows:

Types of response codes

Description

1.  Response codes

RespPay
Credit,
(Mandate) & RespChkTxn API

in RespPay Debit,
Debit

RespPay

These response codes should be populated by the IPS
participant in case of any error.

2.  Response codes in RespPayReversal API

These response codes should be populated by the IPS
participant in case of any error.

3.  Response codes in RespAuthDetail API

These response codes are populated in the error code tag
of the RespAuthDetail API by the IPS participant.

4.  Response codes sent by PSP in Meta API

These response codes are populated in the error code tag
of the Meta API’s

5.  Response codes populated by the IPS

These response codes will be populated by the IPS in the
final responsepay for DEBIT and CREDIT timeouts

IPS API message level Validations

Table 34: Types of response codes

This section will help the IPS participants to send valid data
to the IPS. It will give an outline of valid requests expected
at the IPS end.

Classification: Confidential

114

IPP Error and Response Codes.docx

14. USER PROFILE MANAGEMENT SERVICES

The IPS is an interoperable payment switch which will allow users to access and use services

through various channels. In addition to financial transactions, the IPS switch will also

accommodate profile management services for users to set pin, change pin, and to enquire their

linked store of value balance in an interoperable manner. These use cases are only for pin and

balance enquiry services through third party applications and the USSD channels These use cases

are detailed below.

14.1.

Set Pin and Changing Pin

Use Case ID

IPP-UC131

Use Case Name:

Setting and changing PIN

Use Case Description:

In this use case, the User intends to set an IPS pin or change an existing PIN
through an Issuer’s channel or the universal USSD

End Objective:

User sets new PIN

Primary Actors:

• User
• User IPS Participant

Secondary Actors

IPS Switch

Trigger Event:

The User opens an IPSP’s channel or the central USSD and initiates a set or change
PIN request

IPS Participant business rules

1.  Previous pin cannot be used.

2.  SMS / email notification of pin change success.

3.  Notify the store of value provider of pin settings (Pin Common Library update).

4.  User to reset pin every 6 months.

5.  Negative scenarios for setting and changing pin is (i) not meeting the character criteria and this should

lead to timeout.

6.  Update Pin the Common Library.

7.  User to be reminded to set IPS pin every 6 months.

Classification: Confidential

115

Basic Flow

Figure 29: Set Pin and Changing Pin

Step
ID

1

2

Actors

Action

Notes and references

User

IPSP

User requests to set or change a PIN through the IPSP.

IPSP sends a request to the IPS switch to set the PIN.

Common
library
process: SoV Provider
the SDK
integrates
page where
the
customer sets the PIN.
In essence, the PIN is
therefore set on a
platform provided by
the IPSP but accessible
SoV
through
provider’s channel.

the

3

IPS Switch

The Switch requests the SoV provider to set the pin.

4

5

6

SOV
Participant

SoV Provider communicates to the switch that the PIN
has been successfully set / changed.

IPS Switch

Communicates to the IPSP that the PIN has been
successful set / changed.

IPSP

Provides the User with confirmation that the PIN has
been successfully set / changed.

Classification: Confidential

116

End of use case

Table 35: Use case ID IPP-UC131

14.2.

Balance Enquiry

Use Case ID

IPP-UC132

Use Case Name:

Balance Enquiry

Use
Description:

Case

In this use case, the User requests to see their balance enquiry through
an IPSP

End Objective:

User views balance

Primary Actors:

• User
• User IPS Participant

Secondary Actors

IPS Switch

Trigger Event:

The User opens an IPSP’s channel and initiates a balance enquiry request

IPS Switch Business Rules

Basic Flow

Figure 30: Balance enquiry

Step
ID

Actors

Action

Notes
references

and

1

User

User requests to check their balance at the linked
SoV Provider.

Classification: Confidential

117

2

3

4

5

6

IPSP

IPS participant requests the IPS switch to get the
User’s balance.

IPS Switch

The switch requests the SoV provider to provide
the User’s SoV balance.

SOV
Participant

The SoV Provider responds to the request and
provide the switch with the balance.

IPS Switch

The IPS switch submits the IPS balance to the IPS
participant.

IPSP

The IPS participant shows the User their balance.

End of use case

Table 36: Use case ID IPP-UC132

Classification: Confidential

118

15. DISPUTE MANAGEMENT PROCESS & QUERY MANAGEMENT

15.1.

Dispute Management

The following dispute management process is provided for the IPS.

Figure 31: Dispute Management

•

If the Transaction status is approved - Acquiring / Beneficiary bank can raise the credit

adjustment (return) to remitter bank.

• Reversal confirmation – If any transactions will be marked Credit adjustment or RET by

Acquiring / Beneficiary bank then remitter banks will perform reversal to original customer &

need to update the status RRC (return reversal confirmation) in back office.

• No fees will be charged by the IPS Operator during a dispute management process.

Classification: Confidential

119

Public

Deemed approved.

•

If the beneficiary participant does not respond with the status of transaction as success or

failed, then such transactions will be treated as deemed approved transactions and funds are

credited in favour of beneficiary participant. Beneficiary participants are expected to

reconcile all such deemed approved transactions on T+1 day and initiate suitable actions so

that customers shall get the funds latest by T+1 day otherwise refunds to the originator or

else penalties will be imposed.

•

If the Transaction status is Deemed approved - Acquiring / Beneficiary bank needs to update
the status in back office as TCC (Transaction credit confirmation) or RET (Return)

• The following codes are provided for deemed transactions:

TCC - 102 - Customer account credited online but failed to respond online to the IPS Operator

TCC 103 - Customer account NOT credited online – Credited post Recon.

RET - Customer account cannot be credited due to any reason. In such a case beneficiary

participant should return the funds to remitting participant

Debit Reversal Confirmation (DRC)

•

If the remitting participant does not send debit authorization to the IPS [OR] if beneficiary

participant declines a transaction for any reason, then the IPS Operator will send debit

reversal request message to remitting participant. If remitter participant fails to respond to

the debit reversal message in online mode, then remitting participants are expected to

reconcile, initiate suitable actions (wherever applicable), and update the status (i.e., Debit

Reversal Confirmation) for such un-responded reversals in IPS back-office system (IRCS) on

T+1 day applicable.

• The following codes are provided for debit reversal confirmation:

DRC 102 - Customer account has been reversed online but failed to respond in online mode

to the IPS Operator

DRC 103 - Customer account has NOT been reversed online – Customer account is reversed

post Recon.

Classification: Confidential

120

DRC 104 - Customer account has not been Debited hence no reversal required.

Refund Reversal Confirmation (RRC)

• Customer participants (Remitting/Issuing participants) should download all the credit

adjustments (received for approved transactions) & returns (received from deemed approved

transactions) which are raised by the beneficiary participants/acquiring participants in IRCS

on T+1 day and initiate credits to the respective customers in the core banking systems (CBS).

• Once the reversals are successfully processed in CBS, only then should the customer

participant confirm the status in IRCS with status as RRC adjustment flag and reason code

501.

•

In case a participant fails to update the status in the IRCS in T+1, a penalty would be

applicable. This penalty will be provided for in the IPS Scheme Rules.

Refund Initiation by Merchant – Credit Adjustment

• Credit Adjustment – if Merchant has received online approved response from its Acquiring

participant, however the merchant has not delivered the goods/services as agreed with the

customer. Then post-settlement done by the Acquiring participant has to reconcile at their

end and raise Credit Adjustment/Returns through Bulk upload file (for multiple refunds) or as

a single entry directly on the IRCS (transaction search menu). This way excess funds must be

given back to the Issuer participant.

•

Issuer participant should download all the credit adjustments (received for approved

transactions) by acquiring participants in the IRCS on T+1 working day and should refund the

amount back to the customer.

•

If the Acquiring participant has not raised Credit Adjustment/Returns, customer of Issuing

participant will raise the Complaints to the Issuer participant who will then accordingly raise

a complaint in IRCS.

• TAT – Merchant can refund the Transaction amount Up to 60 days from the next day of

transaction date.

Classification: Confidential

121

15.2.

Chargeback

Figure 32: Chargeback

• All the above disputes will have to be accepted or rejected within TAT otherwise system

will automatically close the window on deemed acceptance basis.

• After completion of settlement process between acquirer and issuer, the Issuing

participant may raise the Chargeback to Acquirer for any of the reason listed. The

Acquiring participant has rights to represent / accept the disputed transactions to the

Issuing participant.

•

•

Issuer participant can raise the Chargeback as per the disputed amount i.e. Full or Partial

Issuer participant can raise the Chargeback in IRCS with applicable reason code. Once the

Chargeback is raised, the disputed amount will be credited to the issuer participant

subject to the acquirer response within the TAT.

•

If the chargeback is accepted, the Acquirer needs to check with the merchant and acquirer

can accept the chargeback within 7days or it will be deemed accepted.

• Chargeback Re-presented - Acquiring Institution may Re-present the transaction again to

the Issuing participant. It should be backed by all the relevant documents whichever is

applicable.

Classification: Confidential

122

15.3.

Pre-Arbitration

• The Issuing participant may use this message as a final attempt to mutually resolve the

disputed transaction before an arbitration is filed with the IPS Operator to resolve the

dispute.

•

•

Issuer participant can raise the Pre-Arbitration as per the Chargeback disputed amount

i.e. Full or Partial.

Issuing participant must raise Pre-Arbitration within 15 calendar days following the

Chargeback Re-presentment date.

• Acquirer bank needs to check with merchant and acquirer can accept the case within 15

days or it will be deemed accepted.

• Acquiring Institution may Re-present the transaction again to the Issuing Institution. It

should be backed by all the relevant documents whichever is applicable.

15.4.

Arbitration

• When the Chargeback and Pre-arbitration process fails to resolve the dispute, the
arbitration process allows the IPS Operator to assign liability to participants for the
disputed transaction.

• The IPS Operator will review all documentation/information submitted by both

participants to determine who has final liability for the transaction.

• The IPS Operator will decide which participant is liable for the disputed transaction. The
decision taken by the IPS Operator in case of arbitration will be final and binding on the
participants.

• The Issuing participant must raise Arbitration request with the IPS Operator within 60

calendar days following the Re-presentment date.

• The Acquiring participant must respond to the arbitration case filing within 15 days from

arbitration received date.

• The IPS operator would respond with a verdict within 60 calendar days following the

arbitration initiation date.

Classification: Confidential

123

This table provides the dispute settlement process of instant payment transactions, including the

transaction life-cycle and turn-around times for the IPS.

ispute
Sta e

Initiatin
Member

Prere uisite

und Mo ement s

Credit
Adjustment/
Refund

Customer
Complaints/
Retrieval
Request

Response
to
Customer
Complaints

Debit Reversal
Confirmation
(DRC)

Transaction
Credit
Confirmation
(TCC)

Acquiring
Participant

Approved
Transaction

ACQ to ISS

Issuing
Participant

Approved
Transaction

Acquiring
Participant

Approved
Transaction

NA

NA

60 days from the next
day of transaction
date.

60 days from the next
day of transaction
date.

15 days from the date
of customer complaint.

Issuing
Participant

Declined
Transaction

NA

T+1 working day.

Acquiring
Participant

Deemed
Approved

NA

T+1 till next 60 days.

Refund/Return
Reversal

Issuing
Participant

Credit
Adjustment/
Returns

NA

Adjustment raised date
(A) : A+1 working day.

Chargeback

Issuing
Participant

Approved
Transaction

ACQ to ISS

Chargeback
Acceptance

Acquiring
Participant

Chargeback

NA

Representment

Acquiring
Participant

Chargeback

ISS to ACQ

90 days from the next
day of transaction
date.

7 calendar days from
the Chargeback
processing date.

7 calendar days from
the Chargeback
processing date.

Classification: Confidential

124

ispute
Sta e

Pre Arbitration

Initiatin
Member

Issuing
Participant

Prere uisite

und Mo ement s

Representment

NA

Pre Arbitration
Acceptance

Acquiring
Participant

Pre Arbitration

ACQ to ISS

Pre Arbitration
Decline

Acquiring
Participant

Pre Arbitration

NA

Arbitration
Case
Filing

Arbitration
Case
Acceptance

Arbitration
Case
Continuation

Arbitration
Case
Withdrawn

Arbitration
Case
Verdict

Issuing
Participant

Pre Arbitration
decline

NA

Acquiring
Participant

Arbitration

NA

Acquiring
Participant

Arbitration

NA

Issuing
Participant

Arbitration

NA

IPS Operator Arbitration

If
issuer wins
the arbitration,
then funds will
be.
moved from
ACQ to ISS

15 days from the next
day of representment.

Acquiring Institution
must respond within
7 calendar days.
following

the
Pre

Arbitration processing
date.

Acquiring Participant
must respond within
15 calendar days
following the Pre
Arbitration processing
date.

Within 15 calendar
days from Pre
Arbitration decline
date.

Within 15 calendar
days from Arbitration
received date.

If no response received
from the Acquiring
Participant within 15
calendar days, then
from Arbitration
received date.

Within 15 calendar
days from Arbitration
raising date.

IPS Operator will give
verdict within 60
calendar days
following the

Classification: Confidential

125

ispute
Sta e

Initiatin
Member

Prere uisite

und Mo ement s

Arbitration initiation
date.

along with
arbitration
fee, which is
collected
from
Issuing.
Participant
(Debit
Acquiring
Participant &
Credit
Participant):

Issuing

a. TXN
Amount.

Interchange

b.
Fee.

c. Arbitration Fee

- Applicable Taxes.

Table 37: Erroneous payments & Query management

RC

1061

1063

1065

1084

1102

Description

TAT

not

Processed

Credit
for
Cancelled or Returned Goods
and Services.

60 Days

Paid by Alternate Means.

60 Days

Services
or
Goods
Provided/Not Received.

Not

60 Days

Duplicate Processing.

60 Days

Retrieval Request not Fulfilled.

60 Days

Table 38: Dispute resolution turnaround times
Note: Fo ddition l d t ils pl s f to “Disput son cod list”.

Classification: Confidential

126

16. FRAUD AND RISK MANAGEMENT

16.1.

FRM Capability Overview

The Enterprise Fraud and Risk Management (EFRM) system forms an integral part of the IPS risk
control framework. It provides a centralized fraud detection, prevention, and monitoring
capability for all transactions processed through the IPS ecosystem.

The EFRM operates as the second layer of fraud mitigation supplementing first-level controls
implemented by IPS Participants (banks, PSPs, MNOs, and other ecosystem entities). It ensures
that even if a participant’s internal controls are bypassed, potential fraudulent behaviour can be
detected at the network level.

The EFRM solution has been implemented and configured on the IPS infrastructure and leverages
real-time transaction data from the IPS Switch through a high-throughput, low-latency
integration layer. The EFRM integrates directly into the online IPS switch to inject transaction
fraud scores into messages being transmitted between participants. Transactions below a
threshold determined by the IPS Operator will be include a fraud score to be dealt with as per
the participant’s internal controls, while transactions above the set threshold will be declined
automatically by the IPS switch.

16.2.

Purpose and Objectives

The EFRM system’s primary purpose is to provide a unified, centralized fraud risk monitoring
framework for the IPS ecosystem, enabling real-time detection and analysis of suspicious
patterns and high-risk transactions.

Objectives:

1.  Detect and prevent fraudulent or suspicious transactions across all IPS channels (Mobile

App, USSD, QR, etc.).

2.  Apply configurable rule-based and model-based risk assessments in real time.
3.  Enable IPN operations and regulatory teams to view alerts, manage investigations, and

maintain audit trails.

4.  Provide centralized visibility across participants and transaction types.
5.  Support compliance and reporting requirements of the IPN.

Classification: Confidential

127

Figure 33: eFRM Architecture

16.3.

Rule Configuration and Execution

• Fraud detection rules are centrally configured within the EFRM solution by IPN and NPCI

based on transaction type, limit, velocity, frequency, and participant profiles.

• Each rule is assigned a risk weight and scoring parameter; the combined score determines

whether the transaction is flagged for further review.

• Rules operate on event streams and include:

o Velocity checks (number of transactions per time period)
o Amount-based thresholds
o Transaction frequency anomalies
o Device and channel consistency
o Beneficiary and sender behavioural profiling

• Rules can be applied in real-time blocking, alert-only, or simulation modes.

Classification: Confidential

128

16.4.

IPS Transaction Flow with eFRM

Figure 34: eFRM transaction flow

Transaction steps:

1.  Payer IPS Participant (Payer PSP) initiates ReqPay.
2.  IPS initiates ReqAuthDetails to Payee PSP.
3.  Payee IPS participant (Payee PSP) responds with RespAuthDetails.
4.  IPS sends payer and payee cred block to EFRM
5.  eFRM will validate the payer and payee cred block and respond in success or failure to

IPS.

6.  IPS initiates ReqPay Debit to Remitter Bank/ SoV provider.
7.  Remitter Bank/SoV provider debits the money and confirms back to IPS.
8.  IPS initiates ReqPay Credit
9.  Beneficiary Bank accepts the money and confirms back to IPS
10. IPS initiates RespPay to Payer IPS Participant (Payer PSP). IPS also initiates transaction

confirmation to Payee IPS Participant (Payee PSP)

16.5.

Operational Behaviour

• The EFRM operates 24/7 and continuously monitors transactions across all channels and

message types (ReqPay, ResPay, ReqListAccount, ReqRegMob, etc.).

• Alerts are generated and classified as high, medium, or low severity depending on the risk

score.

Classification: Confidential

129

• Alerts are routed to the Case Management Portal, where analysts can investigate, link

related transactions, or escalate to participant compliance teams.

• All transaction data, risk scores, and alerts are logged for audit and regulatory reporting.
• The system supports simulation mode, allowing IPN to test new rules before going live.

16.6.

Configuration of EFRM Rules

• The IPS Operator will configure business and regulatory rules on the EFRM.
•

Industry participants may suggest rules to be configured on the solution after having
agreed as an industry on the type of rules to be configured. Such rules must then be
submitted to the IPS Operator for assessment and approval.
Individual participants may also submit customised rules (individual rules) to the IPS
Operator. These rules will not be shared with other participants.

•

Classification: Confidential

130

PART C: PARTICIPANT ONBOARDING

17.

INFRASTRUCTURE REQUIREMENTS

To participate in the IPS, participants need to adhere to the requirements relating to

infrastructure, application, and operations. There are 3 layers for IPS system readiness i.e.,

infrastructure layer, operations layer (which includes recon and dispute handling), and the

application layer.

Requirement

Description

Infrastructure ready

1.  HSMs
2.  UAT, Production & DR Separate Environments
3.  Secured connectivity with the Bank of Namibia (IPS)

Operations ready

1.  3-way Recon Back Office System
2.  Handling customer complaints and disputes (24x7x365)

Application ready

1.  Core banking / wallet system readiness
2.  API enabled switch.
3.  Support PKI Architecture
4.  3 Keys required (SSL, Signer, HSM)
5.  Acquiring
6.  Mobile Application

Table 39: Infrastructure requirements

The above list is not exhaustive, and it is the responsibility of each participant to evaluate their

own environments to determine the actual needs of integration and supporting infrastructure.

Classification: Confidential

131

18. ONBOARDING AND CERTIFICATION

a. Participant Onboarding

The following diagrams provide the onboarding process of a new participant on the IPS.

Figure 35: Participant onboarding

b. Certification Phase

a) Applicants will use the IPS online testing tool to execute prescribed test cases.

b) Automated test tools: applicants can execute test cases 24/7, independently; tools provide

test results in real time (pass / fail)

c) Once all the test cases are executed successfully in the comfort and UAT rounds of testing,

the participant will be provided with a Certification testing sign-off post final log validation.

Classification: Confidential

132

Figure 36: Certification phase diagram

Step

Description

A: Risk validation /
approval

This is the risk and validation phase where the participant is required to
provide the following information for assessment:
• Risk assessment report

B: Legal validation
/ approval

This is the risk and validation phase where the applicant is required to
provide the following information for assessment:
• Signed SLA

C: Certification

This is the certification stage:
• Applicants to be provided with
Certification management tool.

login credentials for using the

• Applicants to fill in the required details and submit the required

documents in the Certification management tool.

• A Certification id will be generated for tracking purposes.
• The onboarding team will receive the request and will screen the soft

copy of the documents submitted by the applicants.

• Once the documents received are successfully screened, the onboarding

request will move to the next process

Table 40: Onboarding phases

Classification: Confidential

133

c. Certification Process Diagram

Figure 37: Certification process diagram

a) Based on the IP details provided, the network team will do the whitelisting process.

b) Whitelisting completed then the test bands/slots will be released to the member banks based

on the rounds opted (i.e., comfort and UAT).

c) Participant configuration in the certification zone will be done by the certification team based

on the request submitted by the participant and allocate the desired slot for the participants.

d) According to the test slots, participants will execute the test cases for the given slots.

e) In the case of test cases fails, the participants will re-test the same and proceed for the review

of the same in the certification zone.

f) Once the comfort and UAT review has been completed, then the request will be moved to

the mobile application testing.

g) Post completion of all the test slot assigned to the participants, it will be put up review for

sign-off process.

h) The Certification team will validate the test cases executed by the participants and will certify

the participant for the same.

i) Once the certification sign-off has been received, the request will be triggered for the next

process which is preproduction and go-live.

Classification: Confidential

134

d. Production and Go-live.

This stage follows there has been sign-off of the certification and testing from the participant.

Figure 38: Production and go-live

a) Once the Certification testing is successfully completed, the participant will be prompted to

submit the required production movement details and documentation to go-live.

b) Once the documentation has been verified by the IPS Operator, production teams of the IPS

Operator and the participant get the participant live on the respective IPS products and

perform sample transactions.

c) Certified members are expected to go-live within 60 days of receiving certification testing

sign-off.

Classification: Confidential

135

19. HANDLE MANAGEMENT

19.1.

Handle Registration

This section deals with the registration of a handle for an IPS participant. This is the handle that

will be used to route IPS transactions and attached to the full form alias of a user to send and

receive IPS transactions. The handle is unique to an IPS participant and is issued by the IPS

Operator. The first step is that the applicant is required to submit a manual form to the IPS

Operator. The following template depicts the information to be retrieved from the form and

populated by the IPS Operator before a handle can be registered:

Requirement

#

A. Participant Identification & Governance

1
2
3
4
5
6
7

Participant Name
Participation Type
License Type
Particiant Region Name
Participant Town Name
Settlement Arrangement
Sponsor Bank

Enabled use cases:

8
8.1 P2P
8.2 P2M
8.3 G2P
8.4 B2P
8.5 Cash-in-at-Merchant
8.6 Cash-out-at-Merchant
8.7 Cash-out-at-ATM

B. Technical & Connectivity Setup

Participant VAT Number
Org ID
Acquirer Institution ID
Participant Identification Code (IFSC)

9
10
11
12
13 Merchant Routing ID (2-Digit)
14
15
16
17
18

Response IP (SIT)
Response IP (UAT)
Response IP (PROD)
Enlisted Product
SWIFT TEST BIC

Response

Text field
Text field

Text field (Bank name)
Indicate all that apply from below
list:

IPS

Classification: Confidential

136

19
20
21
22
23

SWIFT PROD BIC
Account Provider Codes
Account Provider IP Codes
Participant Debit Cap
Settlement Sponsor Participant Net Debit Cab

Text field
Text field
Text field (Namibia Dollar Value)
Text field (Namibia Dollar Value)

C. Participant to provide to IPS Operator

24
25
26

DocSignature - CA (Signer certificate)
SSL Certificate - CA
HSM Certificate - CA

D. IPS Operator to provide to Participant

27
28
29
30
31
32

DocSignature - CA (Signer certificate)
SSL Certificate - CA
HSM public key-CA
SIT Environment IP
UAT Environment IP
PROD Environment IP

Table 41: Onboarding Form Example

The process below describes how a handle is to be issued to a new participant on the IPS switch.

Use Case ID

IPP-UC171

Use Case Name:

Handle Registration

Use Case Description:

In this use case, the Operator registers a new participant and issues a handle.

End Objective:

IPS Operator issues a new handle

Primary Actors:

IPS Participant
IPS Operator

Secondary Actors

None

Trigger Event:

A new IPS participant approaches the IPS Operator with a request to register a
handle

IPS Operator Business Rules

Classification: Confidential

137

1. The handle registration will be performed by the IPS Operator

2.  Request raised through the web portal with documents submitted.

3.  Documentation screening and approvals

4.  Legal, Infosec, Risk and AML Documents, verification and approvals happen in parallel.

5.  Once documents are validated, certification testing will be initiated right away

Applicants Business Rules

1.  Must be a licensed banking institution or payment instrument issuer.

2.  Demonstrate technical capability to interface with the IPS switch.

3.  Signed the FSD and TSD

4.  Signed IPS Business Rules

Basic Flow

Step
ID

Action

1

2

3

4

5

6

7

8

9

A manual form must be submitted to the IPS Operator by the participant.

The participants suggest and provides preferred handle name.

The IPS Operator verifies if the handle is already taken or available.

If the handle is available, the IPS Operator will communicate to the participant that
handle will be assigned.

The front-end portal will capture the information of the participant.

Handle will then be registered in the IPS solution.

The IPS Operator communicates to the participant that their handle has been
successfully registered.

IPS Participant gets an active ORG ID

There will be an API end point where the handle of the participant will be
communicated.

10

A health check message will be exchanged between the participant and the IPS
switch.

End of use case

Notes and
references

Classification: Confidential

138

Table 42: Use case ID IPP-UC171

19.2.

Handle Deregistration, Deactivation, and Reactivation

The process of Handle Deregistration, Handle Deactivation and Handle Reactivation would be an
offline process for which the documents will be shared with the industry participants on a later
date.

Classification: Confidential

139

20. BACK OFFICE AND SETTLEMENT SERVICES

20.1.

Participant Identification Codes

20.1.1. Swift codes

For settlement, system participants will use their existing SWIFT codes for settlement purposes.

SWIFT code will be alpha numeric with 8 digits followed by a 5-6 digits unique numeric code to

be assigned by the IPS Operator. It is not required for IPS participants to have BIC codes if they

are not settlement system participants. IPS participants that only route online messages on the

IPS switch will be issued with participant identification codes which will also be referred to as an

IFSC code1.

20.1.2. IFSC Codes

All IPS participants will be issued with an alphanumeric IFSC code. This code will be used to route

online messages among participants on the IPS switch. The alphanumeric code will be as follows:

• First 4 characters: participant BIC name (only letters)

• Fifth character: participant identifier (0 for banks and 1 for non-banks)

• Last 6 characters: unique number (only numbers)

For example, a bank A's IFSC code will be BANK0654321 while a non-bank's IFSC code will be

NBNK1456789. These codes will be issued by the IPS operator as they will be used to identify

participants in the switch. For settlement purposes, when transactions are downloaded to the

back-office, these IFSC codes will be matched to the SWIFT codes to enable settlement. This also

applies for tiered participation arrangements to identify the obligations of sponsored participants

1 IFSC code will be replaced with an appropriate term after go-live.

Classification: Confidential

140

even though they do not have SWIFT codes (their IFSC code codes will be identifiable through the

direct system participant's SWIFT code).

20.2.

Back Office Management

The Diagram depicts the envisaged back-office operations of the IPS back-office system also

known as the IPS Real Time Clearing and Settlement (IRCS) system. Once a transaction is

completed online in the IPS transaction engine, it immediately moves to the back-office system.

The back-office system performs several functions such as attaching fees and charges to the

transactions, reconciliation and settlement, dispute management, chargeback process,

adjustment process, scheduling process and master configuration. The bank-office system also

prepares settlement files between system participants, calculates fees and penalties for

participants, generates settlement reports for the participants and the NISS. Once a transaction

is cleared for settlement, it goes to the file processing generator (batch processor).

₹

₹

₹

₹

Access / User Management

API

PORTAL

FILE SERVER

HTTPS Rest API

SFTP

Monitoring

Audit
Trail

File Process Generator
(
Batch Processor
)
Batch Layer

Contextual
Batch
View

Postgres

IPS Transaction Engine

KAFKA Topic

Real Time Streaming

BO System

Recon &
Settlement

Dispute
Management

Chargeback
Process

Adjustment
Process

Master
Configuration

Scheduling
Process

Classification: Confidential

141

Figure 39: Back Office Management

The components of the Bank office system are further described below:

Back-office component

Description

• At every end of settlement cycle, IRCS system performs the

reconciliation activity with IPS Switch database to revalidate the

count transaction received through Kafka and available in IPS

Switch. In case of any discrepancy, IRCS system will re-sync the

missing transactions.

• The reconciliation is done automatically without any user

intervention and the summary is available to the admin users in

the portal.

Recon & Settlement

• Funds Settlement among the members is done once or multiple

times, the timing of settlement is configurable in IRCS. The timing

is called as Settlement cycle.

• For each settlement cycle, member wise net amount to be

credited or debited to each member bank is calculated and

accordingly the amount fields are populated in a MNSB (Multi-

lateral Net Settlement Batch) file.

• The file will be in ISO format PACS009 message system which is

generated in IRCS and uploaded to SWIFT for settlement in the

RTGS at the Bank of Namibia (NISS).

• Banks can raise disputes on transactions from the Participant

operations portal.

• The operations Portal will allow the Participants to raise dispute

as a single entry and by uploading a file to raise disputes in bulk.

• The portal will also allow the Participant users to view the raised

Disputes.

• Also, the participants will get a pre-formatted Adjustment report

in csv form at end of each settlement cycle cut off.

Dispute management

and

Adjustment Process

Classification: Confidential

142

Back-office component

Description

• The report shall contain the records of disputes raised by the

participant and disputes raised by other members against them.

•

IRCS maintains several master data such as Participant master,

Users, User Roles and privileges, Dispute type master, fee

masters, etc.

•

IRCS manages process schedules for automating processes. For

example, settlement process is automatically triggered at pre-

configured settlement timings.

• The file reports are generated in predefined formats, which the

Participant users can download for their reconciliation and other

tasks. Various files are generated at pre-defined timings like RAW

Data, NTSL file, Adjustment file etc.

Master configuration

Schedule process

File process generator

User access management

can be provided or restricted to the users by Admin users.

• The access to all IRCS components (menu options)

Table 43: Back-office system

Classification: Confidential

143

20.3.

Back Office Process flow

The Back Office settlement preparation and flow is depicted below:

Figure 40: Transaction clearing process

Classification: Confidential

144

Steps

Actors

Action

1

2

Once a transaction is completed, the IPS Switch sends the

IPS Switch

transaction for further action. If the transaction is successful

or deemed, it is prepared for settlement.

All success/unsuccessful/deemed transactions that go to

IPS Back Office

IPSPs are sorted as per participant and sent to participant

back-office for reconciliation and confirmation.

IPSPs will do reconciliation with RAW file, CBS file and Switch

File.

Post reconciliation, exceptions if any needs to be actioned by

IPSPs for e.g.

a.

In case of deemed transactions, the beneficiary

participant needs

to

raise Transaction Credit

Confirmation (TCC) in the back-office system to confirm

beneficiary has been credited.

b.

In case of non-credit, beneficiary must raise Returns

3

IPS Participants

(RET) in back-office system that will transfer the funds

back to remitter. Once remitter receives the return

credit, remitting participant must raise Debit Reversal

Confirmation (DRC).

c.

If the remitting participant does not send debit

authorization to IPS or if beneficiary participant declines

a transaction for any reason, then the IPS will send a

debit reversal request message to remitting participant.

If remitter participant fails to respond to the debit

reversal message

in online mode, then remitting

participants are expected to reconcile, initiate suitable

Classification: Confidential

145

4

IPS Back Office

actions (wherever applicable) and update the status as

DRC (i.e., Debit Reversal Confirmation).

The Back Office will prepare the clearing files considering

online transaction and Dispute raise by participant to arrive

at a net position (Payable/Receivable) of each participant.

Back office will prepare the settlement file as per NISS RTGS

format with

instructions to debit or credit the NISS

participants.

Notes

1.  This Back Office Process is only for successful transactions; disputed transactions are excluded.

2.  The reconciliation files from the Back Office to the IPSPs will be converted from IPS proprietary

messages to ISO messaging. The return files will also be converted from ISO messaging to proprietary

messaging before settlement.

3.  The settlement file submitted to NISS will also be converted from IPS proprietary messaging to ISO

messaging (PACS009).

4.  The settlement file submitted to the NISS contains net positions among participants that have

obligations towards each other and single instructions for all other participants.

5.  Settlement instructions submitted to the NISS are final and irrevocable

Table 44: Back-office process flow

20.4.

Settlement Process

The settlement process for instant payment transactions begins in the IRCS wherein the IPS

Operator will prepare batch files for submission to the NISS during three (3) settlement cycles.

Multiple transaction between two specific participants will be netted off along with interchange

as well as switching fees and settled in each settlement cycle. For example, as provided in the

table below, Panel A shows that participant A owes N$300 to participant B and participant B owes

N$100 to participant A, this transaction will be netted off in the back office and only a single entry

of N$200 will be passed to the RTGS between participant A (debit) and participant B (credit) as

depicted in panel B. The same example is provided for entries between participant C and B as

Classification: Confidential

146

well as C and A. Note however that there are not mutual obligations between D and B (meaning,

participant D owes participant B, but participant B does not owe participant D anything. In this

regard, this entry is passed as a single entry in the NISS.

Panel A: Participant settlement data

Panel B: Settlement

PARTICIPANT LEVEL DATA
Dr
Participant
A
B
C
A
B
C
A
D

Cr
Participant
B
A
A
C
C
B
D
B

Amount
300
100
800
200
400
800
500
700

Table 45: Settlement process

BILATERAL GROSS SETTLEMENT WITH
NETTING BETWEEN PARTICIPANTS FOR
BOM FOR IPN

NET ENTRY
NET ENTRY

NET ENTRY

Dr Participant
A
C
A
C
D

Cr Participant
B
B
D
A
B

SWITCHING FEE

SWITCHING FEE
SWITCHING FEE
SWITCHING FEE

A

B
C
D

IPN

IPN
IPN
IPN

Amoun
t
200
400
500
600
700

0.4

0.4
0.4
0.4

Interchange fee will be treated in a similar manner as the settlement transactions. The applicable

switching fee will be debited and credited to the IPS Operator’s nominated settlement account

in the RTGS.

All the IPS participants are required to have settlement accounts in the NISS at Bank of Namibia.

If a participant does not have a settlement account in the NISS, then it is treated as a sponsored

participant (known as an indirect system participant) by a system participant who has a NISS

settlement account. The system participant who has the settlement account is referred to as the

direct system participant. The amount for the indirect participant is to be credited or debited

from the direct participant’s settlement account.

Classification: Confidential

147

20.5 Pacs.009 File Specifications

The Pacs.009 file to be generated for the settlement needs to follow the following guidelines:

1.  A batch file will be created containing all pacs.009 messages.
2.  The files should be in XML format.
3.  The naming convention of the files will be in the following format:
    YYYYMMDDHHMMSS pacs.009<CBS number><CNS number>

4.  During each settlement window, two pacs.009 files will be generated for participants. One
    Pacs.009 file that nets the transaction amount with the interchange amount and one
    Pacs.009 file that credits the IPS Operator for the switching fee.

5.  The details to be captured in pacs.009 are mentioned in the Excel attached below:

20.6 Settlement Flow

There are two scenarios in a settlement process, namely a successful settlement process and an
exception handling process (manual process). The diagrams below present both scenarios.

20.6.1 Successful Settlement Flow

Classification: Confidential

148

UPI_NPCIUPINGRTGS20250926_3CBAPANANXXXX_NEDSNANXXXX.xml

Step 1

Remitter Bank

Step 2
Step 3

Step 4

Beneficiary Bank
IRCS Back Office
System
IRCS Back Office
System

A user at Bank A (Remitter Bank) initiates payment, which is
routed through the IPS Switch to a user at Bank B (Beneficiary
Bank) receiving the payment.
User at Bank B (Beneficiary Bank) receives the payment.
The transaction moves to IPN’s IRCS Back Office system (offline
environment).
In the IPN’s IRCS Back Office system (offline environment),
transactions are batched, and the Net Settlement calculation for
all participants is completed.

The back-office system generates a batch of Pacs.009 messages
for each bilateral participant combination with a non-zero net
settlement amount. No Pacs.009 messages are generated for
zero net settlements.
All generated batches of Pacs.009 messages are placed in the
outbound file via SFTP folder.
The Trustlink AXWAY system retrieves the outbound batch of
pacs.009 messages from the SFTP folder for further processing
and transmission to the SWIFT system.
The SWIFT system validates the Batch of Pacs.009 message. Upon
successful validation, SWIFT transmits the batch of pacs.009
message to the Trustlink AXWAY system
The Trustlink AXWAY system routes the Batch of Pacs.009
messages from SWIFT to the National Interbank Settlement
System (NISS) for settlement.
NISS validates the batch of Pacs.009 messages and processes the
settlement.
After successful settlement, NISS responds with a positive
acknowledgement (xsys.002) via AXWAY and sends a copy of the
Pacs.009 to the IRCS and to the relevant participants (Bank A and
Bank B)
Trustlink AXWAY system routes positive acknowledgement
(xsys.002) to SWIFT
SWIFT routes positive acknowledgement (xsys.002) to Trustlink
AXWAY system
Trustlink AXWAY system routes positive acknowledgement
(xsys.002) to SFTP Folder inbound file
SFTP Folder inbound file routes positive acknowledgement
(xsys.002) to IPN’s IRCS Back Office system
The IPN Back Office system generates and distributes through the
SFTP outbound folder transaction and reconciliation reports to
relevant participants.

Step 5

SFTP Folder

Step 6

Trustlink AXWAY
system

Step 7

SWIFT

Step 8

Trustlink AXWAY
system

Step 9

NISS

Step 10

NISS

Step 11

Step 12

Step 13

Step 14

Step 15

Trustlink AXWAY
system
SWIFT

Trustlink AXWAY
system
SFTP Folder

IRCS Back Office
System

Figure 41: Successful settlement flow

Classification: Confidential

149

20.6.2 Exception Handling Flow (Failed SWIFT validation)

Step 1

Remitter Bank

Step 2
Step 3

Step 4

Beneficiary Bank
IRCS Back Office
System
IRCS Back Office
System

Step 5

SFTP Folder

A user at Bank A (Remitter Bank) initiates a payment, which is
routed through the IPS Switch to a user at Bank B (Beneficiary
Bank) receiving the payment.
User at Bank B (Beneficiary Bank) receives the payment.
The transaction moves to IPN’s IRCS Back Office system (offline
environment).
In the IPN’s IRCS Back Office system (offline environment),
transactions are batched, and the Net Settlement calculation for
all participants is completed.
The back-office system generates a batch of Pacs.009 messages for
each bilateral participant combination with a non-zero net
settlement amount. No Pacs.009 messages are generated for zero
net settlements.
All generated batches of Pacs.009 messages are placed in the
outbound file via SFTP folder.

Classification: Confidential

150

Step 6

Trustlink AXWAY
system

Step 7
Step 8

Step 9

Step 10
Step 11

Step 12

Step 13

Step 14

SWIFT
SWIFT

Trustlink AXWAY
system
SFTP Folder
IRCS Back Office
System
SFTP Folder

Trustlink AXWAY
system
SWIFT

Step 15

Step 16

Trustlink AXWAY
system
NISS

Step 17

NISS

Step 18

Step 19

Step 20

Step 21

Step 22

Trustlink AXWAY
system
SWIFT

Trustlink AXWAY
system
SFTP Folder

IRCS Back Office
System

The Trustlink AXWAY system retrieves the outbound batch of
Pacs.009 messages from the SFTP folder for further processing and
transmission to the SWIFT system.
The SWIFT system validates the batch of Pacs.009 message.
Upon failed validation, SWIFT transmits the failed batch of
Pacs.009 message to the Trustlink AXWAY system
Trustlink routes failed batch of Pacs.009 message to SFTP inbound
file
SFTP Folder sends notification to IRCS system
Backoffice system manually amends the failed batch of Pacs.009
message and places it in the outbound file in the SFTP Folder
SFTP Folder Outbound file routes the amended batch of Pacs.009
message to the Trustlink AXWAY system
Trustlink AXWAY system routes the amended batch of Pacs.009
message to SWIFT
The SWIFT system validates the amended batch of Pacs.009
message and upon successful validation routes the batch of
Pacs.009 message to Trustlink AXWAY system
Trustlink AXWAY system routes the amended batch of Pacs.009
message to NISS
NISS validates the amended batch of Pacs.009 message and
processes the settlement.
After successful settlement, NISS responds with a positive
acknowledgement (xsys.002) via AXWAY and further sends a copy
of the amended batch of Pacs.009 message to the IRCS and to the
relevant participants (Bank A and Bank B)
Trustlink AXWAY system routes positive acknowledgement
(xsys.002) to SWIFT
SWIFT routes positive acknowledgement (xsys.002) to Trustlink
AXWAY system
Trustlink AXWAY system routes positive acknowledgement
(xsys.002) to SFTP Folder inbound file
SFTP Folder inbound file routes positive acknowledgement
(xsys.002) to IPN’s IRCS Back Office system
The IPN Back Office system generates and distributes through the
SFTP outbound folder transaction and reconciliation reports to
relevant participants.

Figure 42: Exception handling flow (failed SWIFT validation)

Classification: Confidential

151

20.6.3 Exception Handling Flow (Failed NISS validation)

Step 1

Remitter Bank

Step 2
Step 3

Step 4

Beneficiary Bank
IRCS Back Office
System
IRCS Back Office
System

A user at Bank A (Remitter Bank) initiates a payment, which
is routed through the IPS Switch to a user at Bank B
(Beneficiary Bank) receiving the payment.
User at Bank B (Beneficiary Bank) receives the payment.
The transaction moves to IPN’s IRCS Back Office system
(offline environment).
In the IPN’s IRCS Back Office system (offline environment),
transactions are batched, and the Net Settlement calculation
for all participants is completed.

The back-office system generates a batch of Pacs.009
messages for each bilateral participant combination with a
non-zero net settlement amount. No Pacs.009 messages are
generated for zero net settlements.

Classification: Confidential

152

Step 5

SFTP Folder

Step 6

Trustlink AXWAY
system

Step 7

SWIFT

Step 8

Trustlink AXWAY
system

Step 9
Step 10

NISS
NISS

Step 11

Step 12

Trustlink AXWAY
system
SWIFT

Step 13

Step 14
Step 15

Trustlink AXWAY
system
SFTP Folder
IRCS Back Office
System

Step 16

SFTP Folder

Step 17

Step 18

Trustlink AXWAY
system
SWIFT

Step 19

Step 20

Trustlink AXWAY
system
NISS

Step 21

NISS

Step 22

Trustlink AXWAY
system

All generated batches of Pacs.009 messages are placed in the
outbound file via SFTP folder.
The Trustlink AXWAY system retrieves the outbound batch of
Pacs.009 messages from the SFTP folder for further
processing and transmission to the SWIFT system.
The SWIFT system validates the batch of Pacs.009 message.
Upon successful validation, SWIFT transmits the batch of
Pacs.009 message to the Trustlink AXWAY system
The Trustlink AXWAY system routes the batch of Pacs.009
messages from SWIFT to the National Interbank Settlement
System (NISS) for settlement.
NISS validates the batch of Pacs.009 message
Upon
negative
acknowledgement (xsys.001) and transmits the failed batch
of Pacs.009 message to the Trustlink AXWAY system
Trustlink routes failed batch of Pacs.009 to SWIFT

validation, NISS

issues

failed

a

SWIFT transmits the failed batch of Pacs.009 message by
sending an abort notification (xsys.003) to the Trustlink
AXWAY system
Trustlink routes failed batch of Pacs.009 message to SFTP
inbound file
SFTP Folder sends notification to IRCS system
Backoffice system manually amends the failed batch of
Pacs.009 message and places it in the outbound file in the
SFTP Folder
SFTP Folder Outbound file routes the amended batch of
Pacs.009 message to the Trustlink AXWAY system
Trustlink AXWAY system routes the amended batch of
Pacs.009 message to SWIFT
The SWIFT system validates the amended batch of Pacs.009
message and upon successful validation routes the amended
batch of Pacs.009 message to Trustlink AXWAY system
Trustlink AXWAY system routes the amended batch of
Pacs.009 message to NISS
NISS validates the amended batch of Pacs.009 message and
processes the settlement.
After successful settlement, NISS responds with a positive
acknowledgement (xsys.002) via AXWAY and further sends a
copy of the amended batch of Pacs.009 message to the IRCS
and to the relevant participants (Bank A and Bank B)
Trustlink AXWAY system routes positive acknowledgement
(xsys.002) to SWIFT

Classification: Confidential

153

SWIFT routes positive acknowledgement (xsys.002) to
Trustlink AXWAY system
Trustlink AXWAY system routes positive acknowledgement
(xsys.002) to SFTP Folder inbound file
SFTP Folder inbound file routes positive acknowledgement
(xsys.002) to IPN’s IRCS Back Office system
The IPN Back Office system generates and distributes
transaction and
through
reconciliation reports to relevant participants.

the SFTP outbound

folder

Step 23

SWIFT

Step 24

Step 25

Step 26

Trustlink AXWAY
system
SFTP Folder

IRCS Back Office
System

Figure 43: Settlement Process Flow

20.7 Settlement Times

Table 46: Settlement times

There will be three (3) settlement windows during weekdays and two (2) settlement windows on

Saturday with no settlement taking place on Sundays and public holidays. Each day of the week,

the IPS will generate batch files after transaction cut-off time of 8:00am, 11:00pm, and 15:00pm

respectively. For weekdays, batches will settle within an hour of being generated, save for

Saturday whereby only 2 batches will settle at 9:00am and 12:00pm. All the batches created

between Saturday 15:00 to Sunday 15:00 will settle with the Monday morning batch of 9:00am.

Classification: Confidential

154

20.8 Settlement Reporting

The IPS Operator Back Office produces reports (Raw data, NTSL, Adjustment file, pending for

response to Adjustment, Pending for status report, Time out report) daily from the IPS. These are

settlement reports that are uploaded to the Clearing House Gateway by FTP and then sent to all

the IPS Participants. The reports will be produced at multiple times during the day.

20.9 Participant Net Settlement Reports

The figure below is an example of what is contained in the pre-settlement file sent to each

participant for reconciliation and confirmation during each settlement window. Each participant

will receive a net settlement report (NTSL) containing their settlement obligations (both credits

and debits), interchange to be paid and owed, as well as the switching fee owed to the IPS

operator. The raw data file to accompany the NTSL report will contain the transaction level data

breakup. Participants will only have access to transactions in which they are the beneficiary or

the remitter. Settlement information and figures will be sent to participants at the same time

when the IPS back office submits the file for settlement to the RTGS. Any discrepancies observed

by the participants will be dealt with after settlement. Verification of settlement information and

figures by participants will not impact the settlement process.

Classification: Confidential

155

DescriptionDrCrDescriptionDrCrDescriptionDrCrDescriptionDrCrTxn Amt300100Txn Amt100300Txn Amt800200Txn Amt500Interchange-Interchange-Interchange-Interchange-NET SETTLEMENT WITH B200NET SETTLEMENT WITH A200NET SETTLEMENT WITH A600NET SETTLEMENT WITH A500Txn Amt200800Txn Amt400800Txn Amt800400Txn Amt700Interchange-Interchange-Interchange-Interchange-NET SETTLEMENT WITH C600NET SETTLEMENT WITH C400NET SETTLEMENT WITH B400NET SETTLEMENT WITH B700Txn Amt500Txn Amt700Interchange-Interchange-NET SETTLEMENT WITH D500NET SETTLEMENT WITH D700IPN SWITCHING FEEIPN SWITCHING FEEIPN SWITCHING FEEIPN SWITCHING FEEPARTICIPANT A NTSLPARTICIPANT B NTSLPARTICIPANT C NTSLPARTICIPANT BPARTICIPANT APARTICIPANT APARTICIPANT CPARTICIPANT CPARTICIPANT BPARTICIPANT BPARTICIPANT D NTSLPARTICIPANT APARTICIPANT DPARTICIPANT D

The following excel attachment contains examples of how net settlement will work, as well as
the types of settlement reports that will be created during the settlement process and shared
with the participation for reconciliation purposes:

Once the IPS is operational, the examples provided above will be updated to reflect the actual sample files
produced by the IPS Operator.

20.10 Liquidity Management

Settlement exposure values are available via the web interface. These exposure values are

participant-on-participant, per settlement window for the instant payment stream. A participant

is only able to view its own exposure against each bank. The Bank of Namibia (NISS Operator)

and the IPS Operator can see all participants’ exposure for the settlement day.

Classification: Confidential

156

Net Settlement Examples.xlsx

PART D: IPS PRICING MODEL

21 PRICING COMPONENTS

The IPS pricing model will be applicable to both IPS Participants (IPSPs) and Store of Value

Providers (SoV Providers). For go-live, there will be no pricing or fee for Enablers. The IPS

Operator will charge switching (network) fees for transactions on the use cases. The IPS pricing

model will also allow IPS participants to charge the store of value providers depending on the

transaction. Pricing will be applied based on different criteria, namely, transaction type, purpose

code (use case), initiation mode, merchant category code, and store of value type. The National

Payment System Regulator has determined the Interchange Model for instant payment

transactions as contained in PSD-11. The IPS Operator Scheme Rules will contain the pricing and

charges applicable to participant.

21.1 Onboarding Fee

Participants (IPSPs and SoV Providers) will be charged an onboarding fee, payable during take-on

and before connectivity and testing can commence. The fee will vary depending on the type of

services the Participant intends to provide. The fee will also be different for those fulfilling the

role of both IPSP and SoV Provider, and those only participating either as a IPSP or Store of value

Provider on the IPS. The fee will be revised annually and will serve as a cost recovery mechanism

for the IPS Operator.

21.2 Participation Fee

Participants (IPSPs and SoV Providers) will be charged a once-off non-refundable participation

fee by the IPS Operator. This fee will be levied once a Participant has been successfully onboarded

and is live on the IPS. The fee will be revised annually and will serve as a cost recovery mechanism

for the IPS operator.

Classification: Confidential

157

21.3 Switching Fees and Interchange Rates

This section outlines the IPS switching fee and interchange structure applicable to all participants
and use cases. The switching fees are defined by IPN while interchange structure is determined
by the Regulator.

Interchan e
t pe

Use case

Char e per
transaction

Pa er
PSP

Norma
interchan e

P2M

Re erse
interchan e
Re erse
interchan e

Cash in/ Cash
out
ATM financial
transaction

S itchin
ee
S itchin
ee

P2P

P2M

S itchin
ee

Cash in

S itchin
ee

Cash out

0.40%
transaction
amount
N$ 1.25

Success
N$4.00 plus
N$0.80 per
N$100
Failed N$4.80

N$0.40

N$0.40
equally borne
by Remitter
SOV and
beneficiary SOV
provider
N$0.25 equally
borne by
remitter SOV
and beneficiary
SOV
N$0.40
equally borne
by Remitter
SOV and
beneficiary SOV
provider

Remitter
SO
pro ider

Credit

Debit

Debit

Debit

Debit
N$0.20

P P

IPS

c uirin
PSP

eneficiar
SO
pro ider

Debit

Credit

Credit

Debit
N$0.20

Credit

Credit
N$0.40

Debit
N$0.125

Debit
N$0.125

Credit
N$0.25

Debit
N$0.20

Debit
N$0.20

Credit
N$0.40

S itchin
ee
S itchin
ee
S itchin
ee

ATM cash
withdrawal
B2P

N$0.40

N$0.40

G2P

N$0.40

Table 47: Switching Fees and Interchange Rates

Debit
N$0.40
Debit

Debit

Credit
N$0.40
Credit

Credit

Classification: Confidential

158

The IPS Operator will charge a switching fee for the routing / switching of IPS off-us transactions

but not for on-us transactions. This fee is to cover the cost of the network and a cost-recovery

mechanism. In the case of P2P payments, the switching fee is paid by the remitter (SoV Provider)

participant to the IPS Operator. If a Remitter participant or the payer has used an IPSP (different

from the remitting participant), an IPSP fee is also payable by the remitter participant to the

payer IPSP (see below).

Figure 44: Pricing for P2P Payments

For person to merchant payments, the switching fee will be recovered from both the remitter

participant as well as the merchant participant. This is also applicable to both merchant cash-out

and cash-out in that both the remitter participant and merchant participant will be liable for a

switching fee. The merchant cash-out switching fee will be higher when compared to merchant

Classification: Confidential

159

cash-in fee to discourage high volume cash-out (albeit it being necessary during the early stages

of the IPS with limited use cases, services, sand channels available). If the merchant has used an

IPSP (different from the merchant SoV Provider), there will be an IPSP fee payable by the

merchant’s IPSP to the customer’s IPSP. In normal circumstances, the merchant is liable for a

merchant discount rate (MDR) fee to the acquiring participant. The MDR fee can be set by the

acquiring participant.

Figure 45: Pricing for Merchant Payments

21.3.1 Switching Fee for ATM withdrawals and B/G2P

The switching fee for both ATM withdrawals and Business / Government to person will be

provided once these use cases are fullly developed.

Classification: Confidential

160

21.4 Exiting Fee

The IPS Operator will charge an existing fee to participants based on the level of effort required

by the Operator to remove the participant from the IPS. The exiting fee will not be applicable in

cases where the removal of the participant is ordered by the Regulator.

21.5 Additional Fees

The IPS Operator will charge additional fees depending on the type of services required during

operations. These fees will be provided for in the IPS Scheme Rules and pertain to:

21.5.1 Onboarding additional use cases

21.5.2 Onboarding additional channels

21.5.3 Onboarding additional IPSPs

21.5.4 Suspension of services

21.5.5 Late invoice payments to the IPS Operator

PART E: IPS BUSINESS AND PRODUCT RULES

The IPS Operator shall specify business and product rules to be followed by participants. These

rules will be specified in the IPS Scheme Rules Document. The IPS Scheme Rules Document will

also contain pricing information and procedural guidelines in providing IPS services. The

Document will be guided the Payment System Management Act, 2023 (Act No.14 of 2023) as well

as the Determination for the Authorisation of Payment System Operators and System

Participants in the National Payment System (PSD 6). Some of the business and product rules are

already provided below while some are also provided in the various ows throughout this

document.

Classification: Confidential

161

22 IPS BUSINESS RULES

Only the USSD rules as well as the transaction limits and frequency are provided below. The IPS

Scheme Rules will provide further information.

22.1 USSD Rules

22.1.1 For go-live, only centralised USSD will be allowed for registration, send money,

merchant payment, merchant cash in and merchant cash out.

22.1.2 The centralized USSD will be operated by the IPS Operator.

22.1.3 The IPS Operator will be assigned with a handle to route transactions through the

USSD channel.

22.1.4 Although centralised, the services enabled on the USSD channel will be those of

the payer IPSP or the store of value provider.

22.1.5 The provision of Value-added services (buying airtime, electricity, water, insurance

etc) will not be mandated on the centralised USSD platform for go-live. Participants may

provide these services directly from their own channels.

22.1.6 A switching fee will be applicable to the payer store of value provider for send

money and for both payer store of value provider and merchant acquirer.

22.1.7 The USSD Channel will be zero-rated for Users when dialling the short code.

22.2 . Mobile Application Rules

22.2.1.A mobile application should be able to detect the type of mobile device and allow

a user to bind their mobile number to the mobile device.

22.2.2 Even if a mobile device has 2 sim cards, only one can be used for the device binding

process.

Classification: Confidential

162

22.2.3 A mobile application should be able to detect that the registered sim card has been

removed from the mobile device and prompt the User to perform another device binding

process.

22.2.4 A mobile application on which a User can access IPS services should be password

protected. This includes facial recognition and fingerprint identification.

22.3 Purpose Codes

The following purpose codes have been configured on the IPS.

Purpose
code
00
01
02
03
04
05
06
07
08
09
10
11
12
13

14

15

Description

Category

Default (for any P2P transaction apart from mentioned below) P2P
Salary
Pension
Value added tax(VAT) refund
Annuity
Dividend
Interest (Interest earned)
Merchant payments
Payment to creditor (Credit Transfer)
Bank use – credit transfer (Payment to creditor)
ATM cash out
Merchant cash out
Merchant cash in
Goods/services purchased (for any P2M transaction for
reasons apart from mentioned above)
Government disbursement (for any G2P transaction for
reasons apart from mentioned above)
Merchant payments (for any B2P transaction for reasons apart
from mentioned above)

B2P, G2P
B2P, G2P
G2P, G2B
B2P
B2P
B2P
B2B, B2P
P2P
P2M
P2M
P2M
M2P
P2M

G2P

B2P

Table 48: Purpose codes

22.3. Initiation Modes

The following initiation modes will be used to describe how a transaction was initiated.

Initiation mode
value
01
02
15
16
19
20

Description

Offline / Online

Mode

STATIC QR Code
STATIC Secure QR Code
Dynamic QR Code
Dynamic Secure QR Code
STATIC QR Code
STATIC Secure QR Code

Offline
Offline
Offline
Offline
Online
Online

is used

This
generation

for QR

Classification: Confidential

163

Online
Online
NA

22
23
04
05
18

Dynamic QR Code
Dynamic Secure QR Code
Intent
Secure Intent
Dynamic ATM withdrawal
through OTP.
Default
00
USSD
03
Table 49: Initiation Modes

Non- QR initiation modes

22.4. Transaction Limits, Purpose Codes, and Initiation Modes

This section defines the consolidated transaction framework applicable across all IPS use cases.

The table below provides an integrated view of the transaction limits, purpose codes, and

initiation modes for each use case across both Mobile App and USSD channels. The defined limits

are set at the IPS level and apply per user, per day, across all Store of Value (SoV) accounts and

wallets.

• Limits are defined by the combination of Use Case, Purpose Code, and Initiation Mode.

• MCI (Merchant Cash In) and MCO (Merchant Cash Out) limits are exclusive of the general P2P

and P2M limits.

• The initiation mode defines how a transaction is triggered through a mobile app, USSD, or

other supported channel.

• Where a purpose code applies to multiple initiation modes, all relevant modes are listed

together.

• All limits are set at the IPS level and are reviewed periodically by IPN.

• Bulk File Upload channels are applicable only for G2P and B2P transactions.

• MCI (Merchant Cash-In) and MCO (Merchant Cash-Out) limits apply solely to their respective

purpose codes and are not included in P2P or P2M daily cumulative limits.

• The Initiation Mode column lists system-recognized mode codes; detailed classification

(static/dynamic, online/offline) remains defined in the Initiation Mode Reference Table

(Section 22.3).

•

In case of conflict between IPS-level and participant-level limits, the lower limit will apply.

Classification: Confidential

164

Use
Case

Purpose
Code

Channel &
Initiation Mode

Description

Daily Txn
Amount
Limit

Daily Txn
Count Limit

Limit Set on

Limit inclusive in

P2P

P2P =
'00/08'

Mobile App
Initiation Mode
='01/02/15/16/19/20/22/23'

P2M P2M=
'09/ 13'

MCI MCI =

'12'

MCO MCO =

'11'

Mobile App
Initiation Mode
='01/02/04/05/15/16/19/20/22
/23'

Mobile App
Initiation Mode
='01/02/15/16/19/20/22/23'

Mobile App
Initiation Mode
='01/02/04/05/15/16/19/20/22
/23'

Transaction Limits through Mobile App
10
Txn through any SoV
Account

N$ 10,000

Payer/ Remitter

Overall P2P

Txn through any
Wallet Account

Txn through any SoV
Account

Txn through any
Wallet Account

Txn through any SoV
Account

Txn through any
Wallet Account

Txn through any SoV
Account

Txn through any
Wallet Account

N$ 10,000

10

Payer/ Remitter

Overall P2P

N$ 10,000

100

Payer/ Remitter

Overall P2M

N$ 10,000

100

Payer/ Remitter

Overall P2M

N$ 2,000

N$ 2,000

N$ 2,000

N$ 2,000

5

5

2

2

Payee/
Beneficiary

Payee/
Beneficiary

Exclusive of P2P

Exclusive of P2P

Payer/ Remitter

Exclusive of P2M

Payer/ Remitter

Exclusive of P2M

P2P

P2P =
'00/08'

USSD
Initiation Mode ='03'

Transaction Limits through USSD mode
10
Txn through any SoV
Account

N$ 3,000

Payer/ Remitter

Overall P2P

P2M P2M=
'09/ 13'

USSD
Initiation Mode ='03'

Txn through any
Wallet Account

Txn through any SoV
Account

N$ 3,000

10

Payer/ Remitter

Overall P2P

N$ 3,000

100

Payer/ Remitter

Overall P2M

Classification: Confidential

165

MCO MCO =

'11'

USSD
Initiation Mode ='03'

Txn through any
Wallet Account

Txn through any SoV
Account

Txn through any
Wallet Account

N$ 3,000

100

Payer/ Remitter

Overall P2M

N$ 2,000

N$ 2,000

2

2

Payer/ Remitter

Exclusive of P2M

Payer/ Remitter

Exclusive of P2M

Transaction Limits for use cases which are channel independent

Mobile App
Initiation Mode ='18'

Txn through any
Wallet Account

N $ 2,000

2

Payer/ Remitter

Exclusive of P2M

ATM ATM
='10'
(Categor
y = P2M)

G2P G2P=

Bulk File Upload

Txn by Govt to a user N $ 10,000 Unlimited

Transaction Limits through Bulk File upload mode

B2P

'01/ 02/
03/ 14'
B2P=
'01/ 02/
04/ 05/
06/ 07/
15'

Bulk File Upload

Txn by a merchant to
user

N $ 10,000 Unlimited

Table 50: Transaction limits, purpose codes, and initiation modes

Payee/
Beneficiary

Payee/
Beneficiary

G2P only

B2P only

Classification: Confidential

166

P2P ransactions

1.  Limits will be established at the account level, meaning that if a user has two distinct

accounts, such as a SoV account and a wallet, the limits will be applied separately to each

account. Therefore, the limits for P2P transactions will be N$ 10,000 and a transaction count

of 10 for the wallet, as well as N$ 10,000 and a transaction count of 10 for the SoV account.

2.  For USSD transactions, the limits will be included within the P2P/P2M limits and will be set at

the initiation stage. Consequently, the overall limit for USSD, regardless of the use case, is N$

3,000. For example, if an individual makes a USSD payment of N$ 3,000 in a single day, the

total limit available for P2P/P2M transactions for that individual will be N$ 7,000.

3.  A MCI transaction is regarded as a P2P whereby the merchant will make a payment to the

customer with MCC =0000 and purpose code MCI = 12).

4.  The MCI limit of N$ 2,000, exclusive of overall P2P limits, applies to the Beneficiary’s SoV

Account/ Wallet end, meaning that a user cannot receive more than N$ 2,000 for MCI

purpose codes.

P2M ransactions

1.  In the case of P2M transactions, the limits will also be N$ 10,000 for each SoV and N$

10,000 for each wallet, thereby confirming separate limits for each account type.

2.  MCO limits, where the customer is making a payment to a merchant, will be N$ 2,000 and

will be excluded within the N$ 10,000 limits for a P2M transaction, with this limit being

applied at the Remitter end.

3.  P2M will serve both purchases at merchants and cash out at merchants. A merchant

should have 2 QR codes to distinguish between payments to merchants for purchases and

payments to merchants for cashing out. The appropriate purpose code should be used.

M ransactions

1.  ATM cash withdrawal limits will be separate from the P2M limits, providing the user

with an additional N$ 2,000 limits for ATM withdrawals.

Classification: Confidential

167

2. ATM transactions will occur only through Wallets, thus the limit of N$ 2000 will be on

Wallet only.

23 IPS PRODUCT RULES

To be covered in the IPS Scheme Rules Document

24 SERVICE LEVEL AGREEMENT

To be covered in the IPN Operational SLA

ANNEXURES

To be updated as relevant.

Classification: Confidential

168
