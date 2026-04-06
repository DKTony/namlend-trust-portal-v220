| P       |         | I        |
| ------- | ------- | -------- |
| UNIFIED | AYMENTS | NTERFACE |

Error and Response Codes

UPI Error and Response Codes
Table of Contents

1. Introduction ............................................................................................................................................................................................................................. 3
   1.1 Response codes in RespPay Debit, RespPay Credit, RespPay Debit (Mandate) & RespChkTxn API: ................................................................................................ 3
   1.2 Response codes in RespPayReversal API .................................................................................................................................................................................. 8
   1.3 Response codes in RespAuthDetail API ................................................................................................................................................................................... 9
   1.4 Response codes sent by PSP in Meta API ............................................................................................................................................................................... 11
   1.4.1 RespPay .................................................................................................................................................................................................. 12
2. Codes populated by UPI ........................................................................................................................................................................................................ 13
   2.1 Response codes populated by UPI ......................................................................................................................................................................................... 13
   4.3 UPI API message level Validations .................................................................................................................................................................................... 13
   4.3.1 API : RespAuthDetails .................................................................................................................................................................................. 21
   4.3.3 Meta API : ReqListPsp ................................................................................................................................................................................ 29
   4.3.4 Meta API : ReqSetCre ................................................................................................................................................................................ 30
   4.3.5 Meta API : ReqChkTxn ............................................................................................................................................................................... 32
   4.4 Errors from UPI Service Layer ................................................................................................................................................................................................ 33

UPI Error and Response Codes

1. Introduction
   This document explains the usage of the final RespPay send by UPI and the about the error codes & responsecodes to be used i n UPI system.

1.1 Response codes in RespPay Debit, RespPay Credit, RespPay Debit (Mandate) &
RespChkTxn API:
The below response codes should be populated by the PSP in case of any error. In RespPay Debit, RespPay Credit, RespChkTxn the PSP has to populate the
followingresponseappropriately.
| Response code | | Description | Remarks | TD/BD |
| -------------- | ----------------------------------- | ------------ | -------- | ------ |
| 00 | APPROVED OR COMPLETED SUCCESSFULLY | | | - |
| 15 | ISSUER NOT LIVE ON UPI | | | BD |
59 SUSPECTED FRAUD, DECLINE/TRANSACTIONS DECLINED BASED ON RISKSCORE BY REMITTER BD
| AM | MPIN NOT SET BY CUSTOMER | | | BD |
| --- | ------------------------- | --- | --- | --- |
B1 REGISTERED MOBILE NUMBER LINKED TO THE ACCOUNT HAS BEEN CHANGED/REMOVED BD
TRANSACTION NOT PERMITTED TO THE ACCOUNT (EXAMPLE: MINOR ACCOUNT, PROPRIETOR BD
| B3 | ACCOUNT, | | | |
| --- | --------- | --- | --- | --- |
LEGAL CASE AGAINST THIS ACCOUNT ETC., NRE (AS PER BANK’S POLICY))
| B6 | MISMATCH IN PAYMENT DETAILS | | | TD |
| --- | ------------------------------------------------------ | --- | --- | --- |
| CA | COMPLIANCE ERROR CODE FOR ACQUIRER | | | BD |
| CI | COMPLIANCE ERROR CODE FOR ISSUER | | | BD |
| | | | | BD |
| DF | DUPLICATE RRN FOUND IN THE TRANSACTION. (BENEFICIARY) | | | |
DT DUPLICATE RRN FOUND IN THE TRANSACTION. (REMITTER) BD
| HS | BANKS HSM IS DOWN(REMITTER) | | | TD |
| --- | ---------------------------- | --- | --- | --- |

UPI Error and Response Codes

|     |                                              |     | BD  |
| --- | -------------------------------------------- | --- | --- |
| IC  | DEBIT AMOUNT IS NOT BLOCKED FOR THE CUSTOMER |     |     |
| ID  | DEBIT AMOUNT GREATER THAN BLOCKED AMOUNT     |     | BD  |

ADEQUATE FUNDS NOT AVAILABLE IN THE ACCOUNT BECAUSE FUNDS HAVE BEEN BD
IE
BLOCKED FOR MANDATE
IR UNABLE TO PROCESS DUE TO INTERNAL EXCEPTION AT SERVER/CBS/ETC ON REMITTER SIDE TD

K1 SUSPECTED FRAUD, DECLINE / TRANSACTIONS DECLINED BASED ON RISK SCORE BY REMITTER BD
BD
| LC | UNABLE TO PROCESS CREDIT FROM BANK’S POOL/BGL ACCOUNT | | |
| --- | ------------------------------------------------------ | --- | --- |
LD UNABLE TO PROCESS DEBIT IN BANK’S POOL/BGL ACCOUNT TD
| | | Members shouldnot | TD |
| --- | --- | ------------------ | --- |
decline the original
| | | | |
| --- | --- | --- | --- |
transaction with NO
| NO | NO ORIGINAL REQUEST FOUND DURING DEBIT/CREDIT | | |
| --- | ---------------------------------------------- | --- | --- |
response code, it can be
only used for a response
to check transaction
PS MAXIMUM BALANCE EXCEEDED AS SET BY BENEFICIARY BANK BD
| QU | PAYER ACCOUNT HAS CHANGED(PAYER) | | BD |
| --- | --------------------------------- | --- | --- |
| UA | PSP NOT SUPPORTED BY UPI | | BD |
UNABLE TO PROCESS DUE TO INTERNAL EXCEPTION AT SERVER/CBS/ETC ON BENEFICIARY TD

UB
SIDE
| UP | PSP TIME-OUT | | TD |
| --- | ------------------------- | --- | --- |
| VA | MANDATE HAS BEEN REVOKED | | BD |
BD
| VB | INCORRECT RECURRENCE PATTERN | | |
| --- | ---------------------------------- | --- | --- |
| VC | INCORRECT RECURRENCE PATTERN RULE | | BD |
| VD | INCORRECT AMOUNT RULE | | BD |
BD
| VE | MANDATE IS ALREADY HONOURED | | |
| --- | ---------------------------------- | --- | --- |
| VF | UMN DOES NOT EXIST (REMITTER) | | BD |
| VG | PAYER VPA IS INCORRECT (REMITTER) | | BD |
BD
| VH | MANDATE SIGNATURE IS TAMPERED OR CORRUPT (REMITTER) | | |
| --- | ---------------------------------------------------- | --- | --- |

UPI Error and Response Codes

|     |                                                      |     | BD  |
| --- | ---------------------------------------------------- | --- | --- |
| VI  | EXECUTION DAY AND EXECUTION RULE MISMATCH (REMITTER) |     |     |
| VJ  | PAYER ACCOUNT HAS CHANGED (REMITTER)                 |     | BD  |

NUMBER OF MANDATES ALLOWED ON THIS ACCOUNT HAS EXCEEDED ISSUER'S LIMIT BD
VK
(OPTIONAL: AS PER BANK'S POLICY)
VL MANDATE REGISTRATIONNOT ALLOWED FOR CC PF PPF ACT (BANK'S POLICY) BD

| VM  | NATURE OF DEBIT NOT ALLOWED IN ACCOUNT TYPE |     | BD  |
| --- | ------------------------------------------- | --- | --- |
| VO  | PAYMENT STOPPED BY COURT ORDER              |     | BD  |

BD
| VP | WITHDRAWAL STOPPED OWING TO DEATH OF ACCOUNT HOLDER | | |
| --- | ---------------------------------------------------- | --- | --- |
| VQ | WITHDRAWAL STOPPED OWING TO INSOLVENCY OF ACCOUNT | | BD |
VR WITHDRAWAL STOPPED OWING TO LUNACY OF ACCOUNT HOLD BD
BD
| VS | DUPLICATE MANDATE REQUEST FOR SAME ITEM | | |
| --- | ---------------------------------------- | --- | --- |
| VT | MANDATE IS PAUSED | | BD |
| VU | MANDATE HAS EXPIRED | | BD |
BD
| VY | PAYEE VPA IS INCORRECT (REMITTER) | | |
| --- | ------------------------------------ | --- | --- |
| VZ | PAYMENT STOPPED BY ATTACHMENT ORDER | | BD |
| X6 | INVALID MERCHANT (ACQURIER) | | BD |
| X7 | MERCHANT NOT REACHABLE (ACQURIER) | | TD |
INVALID TRANSACTION OR IF MEMBER IS NOT ABLE TO FIND ANY APPROPRIATE RESPONSE BD
XB
CODE (REMITTER)
INVALID TRANSACTION OR IF MEMBER IS NOT ABLE TO FIND ANY APPROPRIATE RESPONSE BD

XC
CODE (BENEFICIARY)
| XD | INVALID AMOUNT (REMITTER) | | BD |
| --- | -------------------------------------------- | --- | --- |
| XE | INVALID AMOUNT (BENEFICIARY) | | BD |
| XF | FORMAT ERROR (INVALID FORMAT) (REMITTER) | | BD |
| XG | FORMAT ERROR (INVALID FORMAT) (BENEFICIARY) | | BD |
| | | | BD |
| XH | ACCOUNT DOES NOT EXIST (REMITTER) | | |
| XI | ACCOUNT DOES NOT EXIST (BENEFICIARY) | | BD |

UPI Error and Response Codes

|     |                                                    |     | BD  |
| --- | -------------------------------------------------- | --- | --- |
| XJ  | REQUESTED FUNCTION NOT SUPPORTED (REMITTER)        |     |     |
| XK  | REQUESTED FUNCTION NOT SUPPORTED (BENEFICIARY)     |     | BD  |
| XL  | EXPIRED CARD, DECLINE (REMITTER)                   |     | BD  |
| XM  | EXPIRED CARD, DECLINE (BENEFICIARY)                |     | BD  |
| XN  | NO CARD RECORD (REMITTER)                          |     | BD  |
| XO  | NO CARD RECORD (BENEFICIARY)                       |     | BD  |
|     |                                                    |     | BD  |
| XP  | TRANSACTION NOT PERMITTED TO CARDHOLDER (REMITTER) |     |     |

XQ TRANSACTION NOT PERMITTED TO CARDHOLDER (BENEFICIARY) BD
| XR | RESTRICTED CARD, DECLINE (REMITTER) | | BD |
| --- | ------------------------------------ | --- | --- |
BD
| XS | RESTRICTED CARD, DECLINE (BENEFICIARY) | | |
| --- | --------------------------------------- | --- | --- |
| XT | CUT-OFF IS IN PROCESS (REMITTER) | | TD |
| XU | CUT-OFF IS IN PROCESS (BENEFICIARY) | | TD |
BD
XV TRANSACTION CANNOT BE COMPLETED. COMPLIANCE VIOLATION (REMITTER)
XW TRANSACTION CANNOT BE COMPLETED. COMPLIANCE VIOLATION (BENEFICIARY) BD
BD
| XX | NO FINANCIAL ADDRESS RECORD FOUND | | |
| --- | ---------------------------------- | --- | --- |
| XY | REMITTER CBS OFFLINE | | TD |
| Y1 | BENEFICIARY CBS OFFLINE | | TD |
BD
| YA | LOST OR STOLEN CARD (REMITTER) | | |
| --- | ---------------------------------- | --- | --- |
| YB | LOST OR STOLEN CARD (BENEFICIARY) | | BD |
| YC | DO NOT HONOUR (REMITTER) | | BD |
BD
| YD | DO NOT HONOUR (BENEFICIARY) | | |
| --- | ----------------------------------- | --- | --- |
| YE | REMITTING ACCOUNT BLOCKED/FROZEN | | BD |
| YF | BENEFICIARY ACCOUNT BLOCKED/FROZEN | | BD |
| YH | MERCHANT ERROR(ACQUIRING BANK) | | BD |
| YI | INVALID RESPONSE CODE | | BD |
| Z5 | INVALID BENEFICIARY CREDENTIALS | | BD |
| Z6 | NUMBER OF PIN TRIES EXCEEDED | | BD |

UPI Error and Response Codes

Z7 TRANSACTION FREQUENCY LIMIT EXCEEDED AS SET BY REMITTING MEMBER BD
| | | | BD |
| --- | ---------------------------------------------------------- | --- | --- |
| Z8 | PER TRANSACTION LIMIT EXCEEDED AS SET BY REMITTING MEMBER | | |
| Z9 | INSUFFICIENT FUNDS IN CUSTOMER (REMITTER) ACCOUNT | | BD |
ZC ACQUIRER/BENEFICIARY UNAVAILABLE (Reserved for future purpose) TD
BD
| ZD | VALIDATION ERROR | | |
| --- | ------------------------------------ | --- | --- |
| ZF | TRANSACTION NOT PERMITTED TO DEVICE | | BD |
SUSPECTED FRAUD, DECLINE / TRANSACTIONS DECLINED BASED ON RISK SCORE BY BD
ZI
BENEFICIARY
BENEFICIARY OR ACQUIRING SWITCH IS INOPERATIVE/NODE OFFLINE (Reservedfor future TD
ZJ
purpose)
ZK REMITTER SWITCH IS INOPERATIVE/NODE OFFLINE (Reserved for futurepurpose) TD
| ZL | RECEIVED LATE RESPONSE (Reserved for futurepurpose) | | |
| --- | ---------------------------------------------------- | --- | --- |
| ZM | INVALID MPIN | | BD |
ZN FUNCTIONALITY NOT YET AVAILABLE FOR MERCHANT THROUGH THE ACQUIRING BANK BD
BD
ZO FUNCTIONALITY NOT YET AVAILABLE FOR CUSTOMER THROUGH THE PAYEE PSP
ZP BANKS AS BENEFICIARY NOT LIVE ON PARTICULAR TXN TYPE BD
ZQ UNABLE TO PROCESS REVERSAL (Reserved for future purpose) BD
BD
| ZR | INVALID OTP | | |
| --- | ------------------------------- | --- | --- |
| ZS | OTP EXPIRED | | BD |
| ZT | OTP TRANSACTION LIMIT EXCEEDED | | BD |
BD
| ZU | LIMIT EXCEEDED FOR REMITTING BANK/ISSUING BANK | | |
| --- | ----------------------------------------------- | --- | --- |
| ZV | INCORRECT OTP (Reserved for future purpose) | | BD |
| ZX | INACTIVE OR DORMANT ACCOUNT (REMITTER) | | BD |
BD
| ZY | INACTIVE OR DORMANT ACCOUNT (BENEFICIARY) | | |
| --- | ------------------------------------------ | --------------------- | --- |
| | | SCENARIO: For a user | BD |
| | | doing 1st time | |
| FL | FIRST TRANSACTION LIMIT EXCEEDED | transaction in UPI | |
channel, 1st transaction
limit will be limited to

UPI Error and Response Codes

|     |     |     |     |     | Rs5,000 only. Only |     |     |
| --- | --- | --- | --- | --- | ------------------ | --- | --- |

transactions below
Rs.5,000 will be
approvedand above
Rs.5,000 will be rejected
by the remitter bank.
| | | | | | SCENARIO: During the | | BD |
| --- | --- | --- | --- | --- | ---------------------- | --- | --- |
| | | | | | cool down period, the | | |
| | | | | | account holder has | | |
attempted a transaction
| | | | | | | | |
| --- | --- | --- | --- | --- | --- | --- | --- |
of cumulative value
| FP | FREEZE PERIOD FOR FIRST TIME USER | | | | | | |
| --- | ---------------------------------- | --- | --- | --- | --- | --- | --- |
greater than 5k
(Including value of 1st
txn) .This is valid for 24
hours from the first
transaction.
MR Incorrect Account details dueto Amalgamated/Merged Activity on Remitter Side (Remitter) BD
MB Incorrect Account details dueto Amalgamated/Merged Activity on Beneficiary Side (Beneficiary) BD
1.2 Response codes in RespPayReversal API
The below response codes should be populated by the PSP in case of any error. In RespPay Reversal, the PSP has to populateth e same code in both
Errorcode and Respcode Tags.
| Response Code | | Description | | Used In | | Transaction Status | |
| -------------- | --- | ------------ | --- | -------- | --- | ------------------- | --- |
00 REVERSAL SUCCESS 1. RESPONSE DEBIT REVERSAL 2. RESPONSE CREDIT REVERSAL FAILURE
96 REVERSAL FAILURE 1. RESPONSE DEBIT REVERSAL 2. RESPONSE CREDIT REVERSAL DEEMED SUCCESS
| CS | CREDIT SUCCESS | | RESPONSE CREDIT REVERSAL | | | SUCCESS | |
| --- | ---------------- | --- | ------------------------- | --- | --- | -------- | --- |
| NC | CREDIT NOT DONE | | RESPONSE CREDIT REVERSAL | | | FAILURE | |
| ND | DEBIT NOT DONE | | RESPONSE DEBIT REVERSAL | | | FAILURE | |
OC ORIGINAL CREDIT NOT FOUND RESPONSE CREDIT REVERSAL FAILURE

UPI Error and Response Codes

OD ORIGINAL DEBIT NOT FOUND RESPONSE DEBIT REVERSAL FAILURE
1.3 Response codes in RespAuthDetail API
The below response codes are populated in the error codetag of the RespAuthDetail API by the PSP.
| Response | | TD/BD |
| --------- | --- | ------ |
Description Remarks
code
| QA MANDATE IS PAUSED BY USER | | BD |
| ------------------------------ | --- | --- |
BD
| QB MANDATE IS ALREADY HONOURED | | |
| -------------------------------- | --- | --- |
| QC MANDATE HAS BEEN REVOKED | | BD |
| | | BD |
QD MANDATE HAS EXPIRED
| QH TXN AMOUNT DIFFERS FROM MANDATE AMOUNT | | BD |
| ------------------------------------------- | --------------------------------------- | --- |
| | SCENARIO: QR MANDATE COLLECT REQUEST - | BD |
QI PAYEE VPA IS INCORRECT (PAYER)
SOMEONE ELSE TRIES TO VALIDATE. EX- MAY@UPI
DURING CREATION/98820890@UPI DURING FINANCIAL
| | SCENARIO: IN COLLECT REQUEST, DEBIT DONE ON A | BD |
| --- | ---------------------------------------------- | --- |
QK MANDATE REQUEST LIMIT HAS BREACHED
PARTICULAR DATE AND NEW REQUEST IS MADE AGAIN.
BD
| QL MANDATE DEBIT IS BEYOND PSP SPECIFIED AMOUNT CAP | | |
| ----------------------------------------------------- | --- | --- |
| EXECUTION DAY AND EXECUTION RULE MISMATCH | | BD |
QR
(PAYER)
| PAYER PROFILE DOES NOT EXIST (DE REGISTRATION/VPA | | BD |
| -------------------------------------------------- | --- | --- |
QS
REMOVED/UPDATED)
| QU PAYER ACCOUNT HAS CHANGED (PAYER) | | BD |
| ------------------------------------------------ | --------------------------------------------- | --- |
| RA PAYER AND PAYEE ACCOUNT SHOULD NOT BE EQUAL | | BD |
| | SCENARIO: WHEN A CUSTOMER IS MARKED AS SPAM, | BD |

S0 SPAM COLLECT DECLINED BY PSP EXISTING COLLECT REQUESTS RAISED BY HIM WILL BE
DECLINED WITH S1
BD
SCENARIO: INITIATOR OF COLLECT REQUEST IS
S1 PAYEE IS REPORTED AS SPAM UNDER RULE 1
REPORTED AS SPAM

UPI Error and Response Codes

|     |     | AND BLOCKED FOR PERIOD AS SPECIFIED UNDER RULE |     |
| --- | --- | ---------------------------------------------- | --- |

1
| | | SCENARIO: INITIATOR OF COLLECT REQUEST IS | BD |
| --- | --- | ------------------------------------------ | --- |
| | | | |
REPORTED AS SPAM
| S2 | PAYEE IS REPORTED AS SPAM UNDER RULE 2 | | |
| --- | --------------------------------------- | --- | --- |
AND BLOCKED FOR PERIOD AS SPECIFIED UNDER RULE
2
| | | SCENARIO: INITIATOR OF COLLECT REQUEST IS | BD |
| --- | --- | ------------------------------------------ | --- |
| | | | |
REPORTED AS SPAM
| S3 | PAYEE IS REPORTED AS SPAM UNDER RULE 3 | | |
| --- | --------------------------------------- | --- | --- |
AND BLOCKED FOR PERIOD AS SPECIFIED UNDER RULE
3
| | TRANSACTION NOT PERMITTED FOR THIS A/C TYPE | | BD |
| --- | -------------------------------------------- | --- | --- |
SA
(OD/CC/PPI)
| | | SCENARIO: WHEN A CUSTOMER PERCEIVES A COLLECT | BD |
| --- | --- | ---------------------------------------------- | --- |
| | | REQUEST | |

|     |     | AS ILLICIT FROM A PARTICULAR REQUESTER AND |     |
| --- | --- | ------------------------------------------ | --- |

COLLECT REQUEST IS DECLINED AS REQUESTOR IS
| TM | | BLOCKS HIM | |
| --- | --- | ----------- | --- |
BLOCKED BY CUSTOMER
ON THE PSP APPLICATION THEN ALL THE
TRANSACTIONS FROM THAT REQUESTOR WILL BE
DECLINED BY “TM” BY THE PSP OF THE CUSTOMER.
| UX | EXPIRED VIRTUAL ADDRESS | | BD |
| --- | ------------------------ | --- | --- |
BD
| | MANDATE DECLINED AS PAYEE IS NON MERCHANT | | |
| --- | ------------------------------------------ | --- | --- |
VX
(PAYEE)
| X1 | RESPONSE NOT RECEIVED WITHIN TAT AS SET BY PAYEE | | BD |
| --- | ------------------------------------------------- | --- | --- |
| YG | MERCHANT ERROR (PAYEE PSP) | | BD |
| ZA | TRANSACTION DECLINED BY CUSTOMER | | BD |
| ZB | INVALID MERCHANT (PAYEE PSP) | | BD |
| | | | BD |
| ZE | TRANSACTION NOT PERMITTED TO VPA by the PSP | | |
| ZG | VPA RESTRICTED BY CUSTOMER | | BD |
| ZH | INVALID VIRTUAL ADDRESS | | BD |

UPI Error and Response Codes
| 1.4 | Response codes sent by PSP in Meta API | | | | | |
| ---- | --------------------------------------- | --- | --- | --- | --- | --- |
The below response codes are populated in the error code tag of the Meta API’s

| Response |     |             |          |     |         | Type |
| -------- | --- | ----------- | -------- | --- | ------- | ---- |
|          |     | Description | Meta API |     | Remarks |      |

code
| | | | | SCENARIO: CUSTOMER HAS NEVER | | BD |
| --- | --- | --- | --- | ----------------------------- | --- | --- |
| | | | | | | |
| | | | | CREATED/ACTIVATED AN ATM PIN | | |
HOWEVER WHILE CREATING UPI PIN ON
| | | | | | | |
| --- | --- | --- | --- | --- | --- | --- |
THE PSP APP CUSTOMER RANDOMLY
| AJ | CARD IS NOT ACTIVE | | RespRegMob | | | |
| --- | ------------------- | --- | ----------- | --- | --- | --- |
ENTERS ANY NUMERICAL VALUE IN THE
ATM PIN BLOCK IN MOBILE BANKING
REGISTRATION THE RESPONSE SHOULD
BE “AJ”
| | | | RespBalEnq , | | | BD |
| --- | ------------------------- | --- | ------------- | --- | --- | --- |
| AM | MPIN NOT SET BY CUSTOMER | | | | | |
SetCre
| | | | | EG: JOINT ACCOUNT, KARTA ACCOUNT | | BD |
| --- | --- | --- | --- | --------------------------------- | --- | --- |
| | | | | | | |
ETC.
| B2 | ACCOUNT LINKED WITH MULTIPLE NAMES | | RespListAccount | | | |
| --- | ----------------------------------- | --- | ---------------- | --- | --- | --- |
'RESPONSE CODES SENT BY PSP META'!(AS
PER BANK’S POLICY
B3 TRANSACTION NOT PERMITTED TO THE ACCOUNT RespBalEnq BD
| | | | | | | TD |
| --- | --------------------------------------- | --- | ---------------- | --- | --- | --- |
| B7 | BANK CARD MANAGEMENT SYSTEM IS DOWN | | RespRegMob | | | |
| | MOBILE NUMBER REGISTERED WITH MULTIPLE | | | | | BD |
| BR | | | RespListAccount | | | |
CUSTOMER IDS
| | | | RespBalEnq, | | | TD |
| --- | ------------------ | --- | ------------ | --- | --- | --- |
| HS | BANKS HSM IS DOWN | | RespSetCre, | | | |
RespRegMob
| | | | RespListAcc, | | | TD |
| --- | --- | --- | ------------- | --- | --- | --- |

|     | UNABLE TO PROCESS DUE TO INTERNAL EXCEPTION |     | RespBalEnq, |     |     |     |
| --- | ------------------------------------------- | --- | ----------- | --- | --- | --- |

IR
| | AT SERVER/CBS/ETC ON REMITTER SIDE | | RespRegMob, | | | |
| --- | ----------------------------------- | --- | ------------ | --- | --- | --- |
RespSetCreds

UPI Error and Response Codes

| LC  | UNABLE TO PROCESS CREDIT FROM BANK’S |     |     | BD  |
| --- | ------------------------------------ | --- | --- | --- |

RespChkTxn
POOL/BGL ACCOUNT
| LD | UNABLE TO PROCESS DEBIT IN BANK’S POOL/BGL | | | BD |
| --- | ------------------------------------------- | --- | --- | --- |
RespChkTxn
ACCOUNT
| | | | | BD |
| --- | --- | --- | --- | --- |
INVALID MPIN ( VIOLATION OF POLICIES WHILE
| RM | | RespSetCred | | |
| --- | --- | ------------ | --- | --- |
SETTING/CHANGING MPIN )
BD
| | REGISTRATION IS TEMPORARY BLOCKED | | | |
| --- | ---------------------------------- | ----------- | --- | --- |
| RN | | RespRegMob | | |
DUE TO MAXIMUM NO OF ATTEMPTS EXCEEDED
| | ACCOUNT IS ALREADY REGISTERED WITH MBEBA | | | BD |
| --- | ----------------------------------------- | ---------------- | --- | --- |
| RZ | | RespListAccount | | |
FLAG AS 'Y'
| | | | SCENARIO: WHILE CREATING UPI PIN | BD |
| --- | --- | --- | --------------------------------- | --- |
| | | | | |
CUSTOMER HAS ENTERED
| SP | INVALID/INCORRECT ATM PIN | RespRegMob | | |
| --- | -------------------------- | ----------- | --- | --- |
INVALID/INCORRECT ATM PIN IN MOBILE
BANKING REGISTRATION
| VN | VAE DOES NOT EXIST | ReqManageVae | | BD |
| --- | ------------------- | -------------- | --- | --- |
BD
| XH | ACCOUNT DOES NOT EXIST | RespListAccount | | |
| --- | ----------------------- | ----------------- | --- | --- |
| XL | EXPIRED CARD DETAILS | RespRegMob | | BD |
| XN | NO CARD RECORD FOUND | RespRegMob | | BD |
BD
| XR | RESTRICTED CARD | RespRegMob | | |
| --- | ------------------------- | ----------- | --- | --- |
| Z6 | NO OF PIN TRIES EXCEEDED | RespBalEnq | | BD |
| ZM | INVALID / INCORRECT MPIN | RespRegMob | | BD |
BD
| ZR | INVALID / INCORRECT OTP | RespRegMob | | |
| --- | ------------------------ | ----------- | --- | --- |
| ZS | OTP TIME EXPIRED | RespRegMob | | BD |
ZT NUMBER OF OTP’S TRIES HAS BEEN EXCEEDED RespRegMob BD
1.4.1 RespPay

| Response |     | Description |     | TD/BD |
| -------- | --- | ----------- | --- | ----- |

code
BD
| SD | Service disable on UPI/ Customer is not active | | | |
| --- | ----------------------------------------------- | --- | --- | --- |
| CN | Country/ Currency not supported | | | BD |
| IV | Invalid verificationtoken | | | BD |
| PE | Payment validity expired | | | TD |
| RD | Request Decline by the bank | | | BD |

UPI Error and Response Codes
| IN | International Service not activated/disabled | BD |
| --- | --------------------------------------------- | --- | 2. Codes populated by UPI
These are the error codes populatedby UPI in various validation levels

2.1 Response codes populated by UPI
The below response codes will be populatedby UPI in the final responsepay for DEBIT and CREDIT timeouts.

TD/BD
Response
Description
code
| 21 | NO ACTION TAKEN (FULL REVERSAL) | TD |
| --- | -------------------------------- | --- |
| 32 | PARTIAL REVERSAL | TD |
TD
| BT | ACQUIRER/BENEFICIARY UNAVAILABLE(TIMEOUT) | |
| --- | ------------------------------------------ | --- |
| RB | CREDIT REVERSAL TIMEOUT(REVERSAL) | TD |
TD
| RP | PARTIAL DEBIT REVERSAL TIMEOUT | |
| --- | -------------------------------------- | --- |
| RR | DEBIT REVERSAL TIMEOUT(REVERSAL) | TD |
| UT | REMITTER/ISSUER UNAVAILABLE (TIMEOUT) | TD |
4.3 UPI API message level Validations
This section will help UPI users to send valid data to UPI. It will give an outline of valid requests expected at UPI end. Refer API-wise request details expectedat
UPI.
For ReqPay RespPay and RespAuthDetails following prefix error codes are used:
H – Head validation HM – Meta part under Headvalidation T – Txn validation S - RiskScores validation L – Rules validation
R – Payer validation B – Payee validation I – Info validation D – Device validation A – Ac validation C – Creds validation V – Amount validation E – Resp
validation
For MetaApi following prefix error codes areused:

UPI Error and Response Codes

Z – Head validation, P – Payer validation, Y – Link validation, X – Txn validation, K – Ac validation, W – Creds validation, N – NewCred validation J – Payee
validation, O – Info validation, Q – Device validation, F – ReqRegMob validation, G – HeartBeat validation & other meta validation
For all other error codes from UPI service layer the prefix usedis U.
In-case of <Head/> tag missing for any API, we would see U52 error messagecode because we are validating orgId for any request which is contained within

<Head/> tag.

TD/BD
| Error Code | | Message Details | Element/ TAG Name | Attribute | |
| ----------- | --- | ---------------- | ------------------ | ---------- | --- |
H02 VER NUMERIC/DECIMAL MIN LENGTH 1 MAX LENGTH 6 <Head/> ver TD
| H03 | TS MUST BE ISO_ZONE FORMAT | | | ts | TD |
| ---- | --------------------------- | --- | --- | --- | --- |
TD
| H06 | MSGID MUST BE PRESENT MAXLENGTH 35 | | | msgId | |
| ---- | ----------------------------------- | --- | --- | ------ | --- |
| U17 | PSP IS NOT REGISTERED | | | orgId | BD |
TD
| U52 | PSP ORGID NOT FOUND | | <Head/> | orgId | |
| ---- | -------------------- | --- | -------- | ------ | --- |
BUSINESS VALIDATION: API EXPECTED TO HAVE <HEAD/> ELEMENT. ATTRIBUTE VER & TS WILL BE VALIDATED IF CONTAINS DATA. ATTRIBUTE ORGID IS
REQUIRED AND HAS TO BE REGISTERED WITH NPCI. ATTRIBUTE MSGID IS REQUIRED.
| HM1 | META.TAG.NAME MUST BE PRESENT/VALID | | <Meta/> | name | TD |
| ---- | --------------------------------------- | --- | -------- | ------ | --- |
| | | | | | TD |
| HM2 | META.TAG.VALUE MUST BE ISO_ZONE FORMAT | | | value | |
BUSINESS VALIDATION: ELEMENT <META/> TAG IS NOT MANDATORY BUT WILL BE VALIDATED IF GIVEN.
META ELEMENT IS GIVEN ATTRIBUTE NAME AND VALUE BOTH REQUIRED.
| | | | | | TD |
| ---- | ------------------------------------ | --- | ------- | --- | --- |
| T01 | TXN NOT PRESENT | | <Txn/> | | |
| T02 | TXN.ID MUST BE PRESENT MAXLENGTH 35 | | | id | TD |
T03 TXN.NOTE ALPHANUMERIC; MINLENGTH 1 MAXLENGTH 50 note TD
TD
T04 TXN.REFID ALPHANUMERIC; MINLENGTH 1 MAXLENGTH 35 refId
T05 TXN REFURL IS URL; MINLENGTH 1 MAXLENGTH 35 refUrl TD
| T06 | TXN.TS MUST BE ISO_ZONE FORMAT | | | ts | TD |
| ---- | ------------------------------- | --- | --- | --- | --- |
TD
| T07 | TXN.TYPE MUST BE PRESENT/VALID | | | type | |
| ---- | ------------------------------- | --- | --- | ----- | --- |
TXN.ORGTNXID MUST BE PRESENT ALPHANUMERIC; <for REVERSAL, TD
| T08 | | | | orgTxnId | |
| ---- | ------------------------- | --- | -------- | --------- | --- |
| | MINLENGTH 1 MAXLENGTH 35 | | ChkTxn> | | |

UPI Error and Response Codes

|     |     |     | TD  |
| --- | --- | --- | --- |

T09 TXN.ORGTNXID IS ALPHANUMERIC; MINLENGTH 1 MAXLENGTH 35 orgTxnId
| TXN.ORGTNXID IS NOT APPLICABLE FOR THIS TYPE OF | | | TD |
| ------------------------------------------------ | --- | --------- | --- |
| T10 | | orgTxnId | |
TRANSACTION
| TXN.ORGRESPCD MUST BE PRESENT ALPHANUMERIC; | | | TD |
| -------------------------------------------- | --------------- | --- | --- |
| T11 | <for REVERSAL> | | |
MINLENGTH 1 MAXLENGTH 3
| T12 TXN.CUSTREF MUST BE PRESENT; LENGTH 12 | | custRef | TD |
| -------------------------------------------- | ------------------- | -------- | --- |
| | <for DEBIT|CREDIT| | | TD |
| T13 TXN.SUBTYPE MUST BE PRESENT | | subType | |
REVERSAL>
| T14 PURPOSE SHOULD BE PRESENT VALID VALUE | | purpose | TD |
| ------------------------------------------- | --- | -------- | --- |
| | | | TD |
T15 TXN.PURPOSE SHOULD BE 00 WHEN INITIATIONMODE 12 purpose
TD
IM0 INITIATIONMODE SHOULD BE PRESENT AND VALUE(00-32) initiationMode
IM1 INITIATIONMODE=12 (FIR) NOT VALID FOR COLLECT initiationMode TD
| INITIATIONMODE=12 (FIR) NON-PREAPPROVED TRANSACTIONIS | | | BD |
| ------------------------------------------------------ | --- | --------------- | --- |
| IM2 | | initiationMode | |
NOT ALLOWED
| CRED BLOCK SHOULD BE UPIMANDATE OR PREAPPROVED IF | | | TD |
| -------------------------------------------------- | --- | --------------- | --- |
| IM3 | | initiationMode | |
INITIATIONMODE=11
| | <for initiationModeis | | TD |
| ---------------------------------- | ---------------------- | --------------- | --- |
| IM4 UPI 2.0 IS ALLOWING FIR ONLY | | initiationMode | |
other than 12>
| | | | BD |
| -------------------------------------------- | --- | --------------- | --- |
| IM5 PAYEE PSP DOES NOT SUPPORT VERSION 2.0 | | initiationMode | |
| | | | BD |
IM6 BANK/PSP IS NOT SUPPORTING VERSION 2.0
BUSINESS VALIDATION: ELEMENT <TXN/> TAG IS MANDATORY AND HAS TO BE PROVIDED WITH VALID DATA. ATTRIBUTE ID & TYPE ARE MANDATORY.
FOR REFUND TYPE ORGTXNID IS MANDATORY. OTHER ATTRIBUTES WILL BE VALIDATED IN DATA GIVEN. TXN ELEMENT HAS RISKSCORES & RULES
ELEMENTS REFERRED INSIDE.
TXN RISKSCORE PROVIDER MUST BE PRESENT TD
| S01 | < RiskScores/> | provider | |
| ---- | --------------- | --------- | --- |
ALPHANUMERIC; MINLENGTH 1 MAXLENGTH 20
| TXN RISKSCORE TYPE MUST BE PRESENT | | | TD |
| ----------------------------------- | --- | --- | --- |
S02 type
ALPHANUMERIC; MINLENGTH 1 MAXLENGTH 20
TD
TXN RISKSCORE VALUE MUST BE PRESENT
S03 value
NUMERIC; MINLENGTH 1 MAXLENGTH 5
BUSINESS VALIDATION: ELEMENT < RISKSCORES /> TAG IS NOT MANDATORY BUT WILL BE VALIDATED IF GIVEN.
| L01 RULE MUST BE PRESENT WITHIN RULES | < Rules/> | | TD |
| --------------------------------------------------- | ---------- | --- | --- |
| RULE ATTRIBUTE NAME MUST BE PRESENT; ALPHANUMERIC; | | | TD |
L02 name
MINLENGTH 1 MAXLENGTH 20

UPI Error and Response Codes

|     |     |     | TD  |
| --- | --- | --- | --- |

L03 VALUE MUST BE PRESENT; NUMERIC/DECIMAL value <MINAMOUNT>
| RULE ATTRIBUTE VALUE MUST BE PRESENT; NUMERIC; | | | TD |
| ----------------------------------------------- | --- | -------------------- | --- |
| L04 | | value <EXPIREAFTER> | |
MINLENGTH 1 MAXLENGTH 255
BUSINESS VALIDATION: ELEMENT < RULES /> TAG IS NOT MANDATORY BUT WILL BE VALIDATED IF GIVEN.
| | | | TD |
| ------------------------------------------------ | ---------- | ----- | --- |
| R01 PAYER NOT PRESENT | < Payer/> | | |
| R02 PAYER.ADDR MUST BE VALID VPA MAXLENGTH 255 | | addr | TD |
R03 PAYER.NAME ALPHANUMERIC MINLENGTH 1 MAXLENGTH 99 name TD
TD
| R04 PAYER.SEQNUM NUMERIC MINLENGTH 1 MAXLENGTH 3 | | seqNum | |
| -------------------------------------------------- | --- | ------- | --- |
| R05 PAYER.TYPE MUST BE PRESENT/VALID | | type | TD |
| | | | TD |
R06 PAYER.CODE NUMERIC OF LENGTH 4 code
BUSINESS VALIDATION: ELEMENT < PAYER /> TAG IS MANDATORY AND HAS TO BE PROVIDED WITH VALID DATA. ATTRIBUTE ADDR & TYPE ARE
MANDATORY. FOR ENTITY TYPE CODE IS MANDATORY. OTHER ATTRIBUTES WILL BE VALIDATED IN DATA GIVEN. PAYER TAG HAS INFODEVICE AC CREDS
AMOUNT TAG REFERRED INSIDE.
| B01 PAYEES NOT PRESENT | < Payee/> | | TD |
| ------------------------ | ---------- | --- | --- |
TD
| B02 PAYEE NOT PRESENT | | | |
| -------------------------------------------------- | --- | ------- | --- |
| B03 PAYEE.ADDR MUST BE VALID VPA MAXLENGTH 255 | | addr | TD |
| | | | TD |
| B04 PAYEE.SEQNUM NUMERIC MINLENGTH 1 MAXLENGTH 3 | | seqNum | |
TD
B05 PAYEE.NAME ALPHANUMERIC MINLENGTH 1 MAXLENGTH 99 name
| B06 PAYEE.TYPE MUST BE PRESENT/VALID | | type | TD |
| --------------------------------------------- | --- | ----- | --- |
| B07 PAYEE.CODE NUMERIC OF LENGTH 4 | | Code | TD |
| B08 PAYER</PAYEE> ADDRESS CANNOT BE CHANGED | | addr | TD |
BUSINESS VALIDATION: ELEMENT < PAYEE /> TAG IS MANDATORY AND HAS TO BE PROVIDED WITH VALID DATA. ATTRIBUTE ADDR & TYPE ARE
MANDATORY. FOR ENTITY TYPE CODE IS MANDATORY. OTHER ATTRIBUTES WILL BE VALIDATED IN DATA GIVEN. PAYER TAG HAS INFODEVICE AC
AMOUNT TAG REFERRED INSIDE.
| I01 PAYER/PAYEE.INFO MUST BE PRESENT | <Info/> | | TD |
| ------------------------------------------------ | -------- | --------- | --- |
| | | | TD |
| I02 PAYER/PAYEE .INFO.IDENTITY MUST BE PRESENT | | identity | |
| PAYER/PAYEE.INFO.IDENTITY.TYPE MUST BE PRESENT | | | TD |
I03 type
MINLENGTH 1 MAXLENGTH 20

UPI Error and Response Codes

PAYER/PAYEE .INFO.IDENTITY VERIFIEDNAME MUST BE PRESENT TD
| I04 | | verifiedName | |
| ---- | --- | ------------- | --- |
ALPHANUMERIC MINLENGTH 1 MAXLENGTH 99
| PAYER/PAYEE .INFO.RATING WHITELISTED | | | TD |
| ------------------------------------- | --- | ---------------- | --- |
| I05 | | verifiedAddress | |
MUST BE PRESENT MINLENGTH 1 MAXLENGTH 5
BUSINESS VALIDATION: ELEMENT <INFO/> TAG IS NOT MANDATORY BUT WILL BE VALIDATED IF GIVEN. INFO ELEMENT IS GIVEN ALL ATTRIBUTES ARE
REQUIRED. PAYER/PAYEE INCLUDED IN THE MESSAGES WILL COME DEPENDING UPON THEIR TYPE DURING VALIDATION.
TD
| D01 PAYER/PAYEE.DEVICE MUST BE PRESENT | <Device/> | | |
| ---------------------------------------------- | ---------- | --- | --- |
| D02 PAYER/PAYEE. DEVICE.TAGS MUST BE PRESENT | | | TD |
| | | | TD |
D03 PAYER/PAYEE.TAG.DEVICE.NAME/VALUE MUST BE PRESENT name/value
D04 - D11 SAME VALIDATION MESSAGE BASED ON DEVICE TYPE TD
| D12 TELECOM VALUE MUST BE MINLENGTH 1 MAXLENGTH 99 | | | TD |
| ---------------------------------------------------- | --- | --- | --- |
| D13 TELECOM TAG IS ALLOWED ONLY FOR TYPE=USDC/USDB | | | BD |
BUSINESS VALIDATION: ELEMENT < DEVICE /> TAG IS MANDATORY FOR PAYER AND PAYEE FOR RESPECTIVELY PAY AND COLLECT TRANSACTION. IF
DEVICE TAG IS GIVEN WHERE IT IS NOT MANDATORY IT WILL BE VALIDATED. PAYER/PAYEE INCLUDED IN THE MESSAGES WILL COME DEPENDING UPON
THEIR TYPE DURING VALIDATION.
| | | | TD |
| --- | --- | --- | --- |
A01 PAYER/PAYEE.AC MUST BE PRESENT < Ac/>
A02 PAYER/PAYEE .AC.ADDRTYPE MUST BE PRESENT addrType TD
| A03 PAYER/PAYEE .AC.DETAIL MUST BE PRESENT | | detail | TD |
| -------------------------------------------- | --- | ------- | --- |
| | | | TD |
A04 PAYER/PAYEE .AC.NAME MUST BE PRESENT name
PAYER/PAYEE .AC.DETAIL.AADHAR MUST BE PRESENT OR NOT
| | | | TD |
| --- | --- | --- | --- |
A05
VALID
PAYER/PAYEE .AC.DETAIL.ACCOUNTMUST BE PRESENT OR NOT TD
A06
VALID
A07 PAYER/PAYEE .AC.DETAIL.MOBILE MUST BE PRESENT OR NOT VALID TD
TD
A08 PAYER/PAYEE .AC.DETAIL.CARD MUST BE PRESENT OR NOT VALID
| | | | TD |
| --- | --- | --- | --- |
A09 PAYER/PAYEE .AC.DETAIL.VALUE INCORRECT FORMAT <NAME>
BUSINESS VALIDATION: ELEMENT < AC /> TAG IS MANDATORY FOR PAYER AND PAYEE FOR RESPECTIVELY PAY AND COLLECT TRANSACTION.
IF AC TAG IS GIVEN WHERE IT IS NOT MANDATORY IT WILL BE VALIDATED. FOR PAY TRANSACTION IF CREDENTIAL IS PREAPPROVED AC NOT REQUIRED
FOR PAYER. AC VALIDATION IS DONE BASED ON AADHAR ACCOUNT MOBILE CARD. PAYER/PAYEE INCLUDED IN THE MESSAGES WILL COME
DEPENDING UPON THEIR TYPE DURING VALIDATION.
| | | | TD |
| ------------------------------------ | --------- | --- | --- |
| C01 PAYER/PAYEE .CREDS NOT PRESENT | <Creds/> | | |

UPI Error and Response Codes

|     |                                               |     |     | TD  |
| --- | --------------------------------------------- | --- | --- | --- |
| C02 | PAYER/PAYEE .CREDS.CRED MUST BE PRESENT       |     |     |     |
| C03 | PAYER/PAYEE.CRED DATA IS WRONG                |     |     | TD  |
| C04 | PAYER/PAYEE .CRED.AADHAR MUST BE PRESENT      |     |     | TD  |
|     |                                               |     |     | TD  |
| C05 | PAYER/PAYEE .CRED.OTP MUST BE PRESENT         |     |     |     |
| C06 | PAYER/PAYEE .CRED.PIN MUST BE PRESENT         |     |     | TD  |
| C07 | PAYER/PAYEE .CRED.CARD MUST BE PRESENT        |     |     | TD  |
|     |                                               |     |     | TD  |
| C08 | PAYER/PAYEE .CRED.PREAPPROVED MUST BE PRESENT |     |     |     |
| C09 | PAYER/PAYEE .CRED.DATA MUST BE PRESENT        |     |     | TD  |

PAYER/PAYEE . .CRED.DATA ENCRYPTED AUTHENTICATION MUST TD
C10
BE PRESENT
BUSINESS VALIDATION: ELEMENT < CREDS /> TAG IS MANDATORY FOR PAYER FOR PAY TRANSACTION. IF CREDS TAG IS GIVEN WHERE IT IS NOT
MANDATORY IT WILL BE VALIDATED. PAYER/PAYEE INCLUDED IN THE MESSAGES WILL COME DEPENDING UPON THEIR TYPE DURING VALIDATION.
| V01 | PAYER/PAYEE. AMOUNT MUST BE PRESENT | < Amount/> | | TD |
| ---- | ---------------------------------------- | ----------- | ----- | --- |
| V02 | PAYER/PAYEE .AMOUNT.CUR MUST BE PRESENT | | curr | TD |
| | | | | TD |
PAYER/PAYEE.AMOUNT.VALUE MUST BE WITHIN 18 DIGITS
V03 value
INCLUDING TWO DECIMAL
| V04 | PAYER/PAYEE .AMOUNT.SPLIT.NAME MUST BE PRESENT | | | TD |
| ---- | ------------------------------------------------ | --- | --- | --- |
| | PAYER/PAYEE .AMOUNT.SPLIT.VALUE MUST BE PRESENT | | | TD |
V05
MINLENGTH 1 MAXLENGTH 18
| V06 | PAYEE AMOUNT CANNOT BE CHANGED | | | TD |
| ---- | ------------------------------- | --- | --- | --- |
TD
| M01 | PAYEE.AMOUNT.CUR MUST BE CONSISTENT | | | |
| ---- | ---------------------------------------- | --- | --- | --- |
| M02 | PAYEE.AMOUNT.CUR IS INVALID | | | TD |
| | | | | TD |
| M03 | PAYER & PAYEE TOTAL AMOUNT NOT MATCHING | | | |
TD
| M04 | ONE OR MORE PAYEE AMOUNT IS MISSING | | | |
| ---- | ------------------------------------------ | --- | --- | --- |
| M05 | PAYER AND PAYEE TOTAL AMOUNT NOT MATCHING | | | TD |
| | | | | TD |
| M06 | MORE THAN ONE PAYEE AMOUNT IS MISSING | | | |
PAYER AMOUNT SHOULD BE GREATER THAN TOTAL PAYEE
| | | | | TD |
| --- | --- | --- | --- | --- |
M07
AMOUNT
| | | | | BD |
| ---- | ------------------------------------- | --- | --- | --- |
| UP1 | NOT A VALID AMOUNT FOR THIS CATEGORY | | | |

UPI Error and Response Codes

BUSINESS VALIDATION: ELEMENT < AMOUNT /> TAG IS MANDATORY FOR BOTH PAYER & PAYEE. IT CHECKS CURRENCY & AMOUNT MATCHING FOR
PAYER & PAYEE. PAYER/PAYEE INCLUDED IN THE MESSAGES WILL COME DEPENDING UPON THEIR TYPE DURING VALIDATION.
| | | | | | TD |
| --- | --- | --- | --- | --- | --- |
PM0 MERCHANT TAG IS MANDATORY IF PAYER/PAYEE IS ENTITY <Merchant/>
| | PAYER/PAYEE.MERCHANT.IDENTIFIER.SUBCODE MUST BE NUMERIC | | | | TD |
| ---- | -------------------------------------------------------- | -------------- | --- | -------- | --- |
| PM1 | | <Identifier/> | | subCode | |
AND OF LENGTH 4
| | PAYER/PAYEE.MERCHANT.IDENTIFIER.MID MUST BE OF | | | | TD |
| ---- | ----------------------------------------------- | --- | --- | ---- | --- |
| PM2 | | | | mid | |
MINLENGTH 1 MAXLENGTH 20
| | PAYER/PAYEE.MERCHANT.IDENTIFIER.SID MUST BE OF | | | | TD |
| ---- | ----------------------------------------------- | --- | --- | ---- | --- |
| PM3 | | | | sid | |
MINLENGTH 1 MAXLENGTH 20
| | PAYER/PAYEE.MERCHANT.IDENTIFIER.TID MUST BE OF | | | | TD |
| --- | ----------------------------------------------- | --- | --- | --- | --- |

| PM4 | MINLENGTH 1 MAXLENGTH 20                   |         |     | tid   |     |
| --- | ------------------------------------------ | ------- | --- | ----- | --- |
|     | PAYER/PAYEE.MERCHANT.NAME.BRAND MUST BE OF |         |     |       | TD  |
| PM5 |                                            | <Name/> |     | brand |     |

MINLENGTH 1 MAXLENGTH 20
| | PAYER/PAYEE.MERCHANT.NAME.LEGAL MUST BE OF | | | | TD |
| ---- | ------------------------------------------- | --- | --- | ------ | --- |
| PM6 | | | | legal | |
MINLENGTH 1 MAXLENGTH 20
| | PAYER/PAYEE.MERCHANT.NAME.FRANCHISE MUST BE OF | | | | TD |
| ---- | ----------------------------------------------- | --- | --- | ---------- | --- |
| PM7 | | | | franchise | |
MINLENGTH 1 MAXLENGTH 20
TD
PM8 PAYER/PAYEE.MERCHANT.OWNERSHIP MUST BE PRESENT <Ownership/>
PM9 PAYER/PAYEE.MERCHANT.OWNERSHIP.TYPE MUST BE PRESENT type TD
| | | | | | TD |
| ----- | ------------------------------ | --- | --- | --- | --- |
| PM16 | ALREADY PROCESSED TRANSACTION | | | | |
PN0 MERCHANT TAG SHOULD NOT BE PRESENT IF PAYER/PAYEE IS TD
<Merchant/>
PERSON
PN1 PAYER/PAYEE.MERCHANT.IDENTIFIER.MERCHANTTYPE MUST BE TD
type
VALID
BUSINESS VALIDATION: ELEMENT <MERCHANT/> TAG IS NOT MANDATORY FOR BOTH PAYER & PAYEE. IT GIVES MERCHANT’S DETAILS USING
INTERMEDIATE GATEWAY. IF MERCHANTTAG IS GIVEN, OWNERSHIP TAG AND OWNERSHIP TYPE IS MANDATORY.
INSTITUTION TAG SHOULD BE PRESENT IF INITIATIONMODE=12 TD
| PI0 | | <Institution /> | | | |
| ---- | --- | ---------------- | --- | --- | --- |
(FIR)
| | | | | | TD |
| --- | --- | --- | --- | --- | --- |
PI1 PAYER.INSTITUTION.TYPE MUST BE PRESENT AMONG MTO|BANK type
| | | | | | TD |
| --- | --- | --- | --- | --- | --- |
PI2 PAYER.INSTITUTION.ROUTE MUST BE PRESENT AMONG MTSS|RDA route
TD
| PI3 | PAYER.INSTITUTION.NAME MUST BE PRESENT | <Name/> | | | |
| ---- | --------------------------------------- | -------- | --- | --- | --- |

UPI Error and Response Codes

PAYER.INSTITUTION.NAME.VALUE MUST BE PRESENT,MINLENGTH TD
| PI4 | | value | |
| ---- | --- | ------ | --- |
1 MAXLENGTH 100
PAYER.INSTITUTION.NAME.ACNUM MUST BE PRESENT,MINLENGTH TD
| PI5 | | acNum | |
| ---- | --- | ------ | --- |
1 MAXLENGTH 50
TD
| PI6 PAYER.INSTITUTION.PURPOSE MUST BE PRESENT | <Purpose/> | | |
| ----------------------------------------------- | ----------- | ----- | --- |
| PAYER.INSTITUTION.PURPOSE.CODE MUST BE | | | TD |
| PI7 | | code | |
PRESENT,MINLENGTH 1 MAXLENGTH 50
PI8 PAYER.INSTITUTION.ORIGINATOR MUST BE PRESENT <Originator/> TD
| PAYER.INSTITUTION.ORIGINATOR.NAME MUST BE | | | TD |
| ------------------------------------------ | --- | ----- | --- |
| PI9 | | name | |
PRESENT,MINLENGTH 1 MAXLENGTH 50
| PAYER.INSTITUTION.ORIGINATOR.REFNO MUST BE | | | TD |
| ------------------------------------------- | --- | ------ | --- |
| PJ1 | | refNo | |
PRESENT,MINLENGTH 1 MAXLENGTH 35
TD
PJ2 PAYER.INSTITUTION.ORIGINATOR.ADDRESS MUST BE PRESENT <Address/>
PAYER.INSTITUTION.ORIGINATOR.ADDRESS.LOCATION MUST BE
| | | | TD |
| ---- | --- | --------- | --- |
| PJ3 | | location | |
PRESENT,MINLENGTH 1 MAXLENGTH 40
TD
PJ4 PAYER.INSTITUTION.BENEFICIARY MUST BE PRESENT <Beneficiary/>
PAYER.INSTITUTION.BENEFICIARY.NAME MUST BE TD
| PJ5 | | name | |
| ---- | --- | ----- | --- |
PRESENT,MINLENGTH 1 MAXLENGTH 50
PAYER.INSTITUTION.ORIGINATOR.TYPE MUST BE PRESENT, TD
| PJ6 | <Originator/> | type | |
| ---- | -------------- | ----- | --- |
INDIVIDUAL|COMPANY
PAYER.INSTITUTION.ORIGINATOR.ADDRESS.CITYMUST BE TD
| PJ7 | <Address/> | city | |
| ---- | ----------- | ----- | --- |
PRESENT,MINLENGTH 1 MAXLENGTH 100
| PAYER.INSTITUTION.ORIGINATOR.ADDRESS.COUNTRY MUST BE | | | TD |
| ----------------------------------------------------- | --- | -------- | --- |
| PJ8 | | country | |
PRESENT,MINLENGTH 1 MAXLENGTH 100
PAYER.INSTITUTION.ORIGINATOR.ADDRESS.GEOCODE MUST BE TD

| PJ9 |     | geocode |     |
| --- | --- | ------- | --- |

PRESENT, IN nn.nnnn,nn.nnnn FORMAT
PAYER.INSTITUTION.PURPOSE.NOTE MUST BE TD
| PJ0 | <Purpose/> | note | |
| ---- | ----------- | ----- | --- |
PRESENT,MINLENGTH 1 MAXLENGTH 50
INSTITUTION TAG SHOULD NOT BE PRESENT IF INITIATIONMODE TD
| PK0 | <Instituition/> | | |
| ---- | ---------------- | --- | --- |
OTHER THAN 12
BUSINESS VALIDATION: ELEMENT <INSTITUTION/> TAG IS NOT MANDATORYFOR BOTH PAYER. IT GIVES INSTITUTION DETAILS OF NRE|NRO
TRANSACTIONS.

UPI Error and Response Codes

4.3.1 API : RespAuthDetails

TD/BD
| Error Code | | Message Details | Element/ TAG Name | | Attribute | |
| ----------- | ---------------------------------------------- | ---------------- | ------------------ | --- | ---------- | --- |
| | | | | | | TD |
| H02 | VER NUMERIC/DECIMAL MIN LENGTH 1 MAX LENGTH 6 | | | | ver | |
TD
| H03 | TS MUST BE ISO_ZONE FORMAT | | | | ts | |
| ---- | ----------------------------------- | --- | -------- | --- | ------ | --- |
| H06 | MSGID MUST BE PRESENT MAXLENGTH 35 | | | | msgId | TD |
| | | | | | | BD |
| U17 | PSP IS NOT REGISTERED | | | | orgId | |
| U52 | PSP ORGID NOT FOUND | | <Head/> | | orgId | TD |
BUSINESS VALIDATION: API EXPECTED TO HAVE <HEAD/> ELEMENT. ATTRIBUTE VER & TS WILL BE VALIDATED IF CONTAINS DATA.
ATTRIBUTE ORGID IS REQUIRED AND HAS TO BE REGISTERED WITH NPCI. ATTRIBUTE MSGID IS REQUIRED.
| E01 | <RESP> MUST BE PRESENT | | < Resp/> | | | TD |
| ---- | ----------------------- | --- | --------- | --- | --- | --- |
E02 RESP.MSGID MUST BE PRESENT MAXLENGTH 35 reqMsgId TD
| | RESP.RESULT MUST BE PRESENT ALPHANUMERIC | | | | | TD |
| --- | ----------------------------------------- | --- | --- | --- | --- | --- |

| E03 |     |     |     |     | result |     |
| --- | --- | --- | --- | --- | ------ | --- |

MIN LENGTH 1 MAX LENGTH 20
| | | | | | | TD |
| ---- | ------------------------------- | --- | --- | --- | -------- | --- |
| E04 | RESP.ERRORCODE MUST BE PRESENT | | | | errCode | |
TD
| E05 | RESP.ERRORCODE SHOULD NOT BE PRESENT | | | | errCode | |
| ---- | ------------------------------------- | --- | --- | --- | -------- | --- |
BUSINESS VALIDATION: ELEMENT < RESP /> TAG IS MANDATORY. ATTRIBUTE MSGID AND RESULT ARE MANDATORY. ERRCODE IS MANDATORY IF RESULT
IS FAILURE.
TD
| T01 | TXN NOT PRESENT | | <Txn/> | | | |
| ---- | ------------------------------------------------ | --- | ------- | --- | ----- | --- |
| T02 | TXN.ID MUST BE PRESENT MAXLENGTH 35 | | | | id | TD |
| | | | | | | TD |
| T03 | TXN.NOTE ALPHANUMERIC; MINLENGTH 1 MAXLENGTH 50 | | | | note | |
TD
T04 TXN.REFID ALPHANUMERIC; MINLENGTH 1 MAXLENGTH 35 refId
| T06 | TXN.TS MUST BE ISO_ZONE FORMAT | | | | ts | TD |
| ---- | --------------------------------------- | --- | ------------------- | --- | -------- | --- |
| | | | | | | TD |
| T07 | TXN.TYPE MUST BE PRESENT/VALID | | | | type | |
| T12 | TXN.CUSTREF MUST BE PRESENT; LENGTH 12 | | | | custRef | TD |
| | | | <for DEBIT|CREDIT| | | | TD |
| T13 | TXN.SUBTYPE MUST BE PRESENT | | | | subType | |
REVERSAL>

UPI Error and Response Codes

|     |                                                   |     |                | TD  |
| --- | ------------------------------------------------- | --- | -------------- | --- |
| T14 | TXN.PURPOSE MUST BE PRESENT/VALID                 |     | purpose        |     |
| T17 | TXN.TYPE DIFFERS FROM ORIGINAL REQUEST            |     |                | TD  |
|     | CRED BLOCK SHOULD BE UPIMANDATE OR PREAPPROVED IF |     |                | TD  |
| IM3 |                                                   |     | initiationMode |     |

INITIATIONMODE=11
BUSINESS VALIDATION: ELEMENT <TXN/> TAG IS MANDATORY AND HAS TO BE PROVIDED WITH VALID DATA. ATTRIBUTE ID & TYPE ARE MANDATORY.
OTHER ATTRIBUTES WILL BE VALIDATED IN DATA GIVEN. TXN ELEMENT HAS RISKSCORES ELEMENTS REFERRED INSIDE.
| | TXN RISKSCORE PROVIDER MUST BE PRESENT ALPHANUMERIC; | | | TD |
| ---- | ----------------------------------------------------- | --------------- | --------- | --- |
| TR1 | | < RiskScores/> | provider | |
MINLENGTH 1 MAXLENGTH 20
| | TXN RISKSCORE TYPE MUST BE PRESENT ALPHANUMERIC; | | | TD |
| --- | ------------------------------------------------- | --- | --- | --- |
TR2 type
MINLENGTH 1 MAXLENGTH 20
TXN RISKSCORE VALUE MUST BE PRESENT NUMERIC; MINLENGTH 1 TD

| TR3 | MAXLENGTH 5 |     | Value |     |
| --- | ----------- | --- | ----- | --- |

BUSINESS VALIDATION: ELEMENT < RISKSCORES /> TAG IS NOT MANDATORY BUT WILL BE VALIDATED IF GIVEN.
| R01 | PAYER NOT PRESENT | < Payer/> | | TD |
| ---- | ------------------------------------------------ | ---------- | ----- | --- |
| R02 | PAYER.ADDR MUST BE VALID VPA MAXLENGTH 255 | | addr | TD |
| | | | | TD |
| R03 | PAYER.NAME ALPHANUMERIC MINLEGTH 1 MAXLENGTH 99 | | name | |
R04 PAYER.SEQNUM NUMERIC MINLEGTH 1 MAXLENGTH 3 seqNum TD
| R05 | PAYER.TYPE MUST BE PRESENT/VALID | | type | TD |
| ---- | --------------------------------- | --- | ----- | --- |
| | | | | TD |
| R06 | PAYER.CODE NUMERIC OF LENGTH 4 | | code | |
| | | | | TD |
T20 PAYER.INSTITUTION SHOULD NOT BE PRESENT <Institution/>
BUSINESS VALIDATION: ELEMENT < PAYER /> TAG IS MANDATORY AND HAS TO BE PROVIDED WITH VALID DATA. ATTRIBUTE ADDR & TYPE ARE
MANDATORY. FOR ENTITY TYPE CODE IS MANDATORY. OTHER ATTRIBUTES WILL BE VALIDATED IN DATA GIVEN. PAYER TAG HAS INFODEVICE AC CREDS
AMOUNT TAG REFERRED INSIDE.
| | | | | TD |
| ---- | -------------------------------------------- | ---------- | ------- | --- |
| B01 | PAYEES NOT PRESENT | < Payee/> | | |
| B02 | PAYEE NOT PRESENT | | | TD |
| B03 | PAYEE.ADDR MUST BE VALID VPA MAXLENGTH 255 | | addr | TD |
| | | | | TD |
| B04 | PAYEE.SEQNUM NUMERIC MINLEGTH 1 MAXLENGTH 3 | | seqNum | |
B05 PAYEE.NAME ALPHANUMERIC MINLEGTH 1 MAXLENGTH 99 name TD
| B06 | PAYEE.TYPE MUST BE PRESENT/VALID | | type | TD |
| ---- | --------------------------------- | --- | ----- | --- |

UPI Error and Response Codes

|     |                                |     |      | TD  |
| --- | ------------------------------ | --- | ---- | --- |
| B07 | PAYEE.CODE NUMERIC OF LENGTH 4 |     | Code |     |
| B09 | MULTIPLE PAYEES NOT ALLOWED    |     |      | BD  |

BUSINESS VALIDATION: ELEMENT < PAYEE /> TAG IS MANDATORY AND HAS TO BE PROVIDED WITH VALID DATA. ATTRIBUTE ADDR & TYPE ARE
MANDATORY. FOR ENTITY TYPE CODE IS MANDATORY. OTHER ATTRIBUTES WILL BE VALIDATED IN DATA GIVEN. PAYER TAG HAS INFODEVICE AC
AMOUNT TAG REFERRED INSIDE.
| I01 | PAYER/PAYEE.INFO MUST BE PRESENT | <Info/> | | TD |
| ---- | --------------------------------- | -------- | --- | --- |
I02 PAYER/PAYEE .INFO.IDENTITY MUST BE PRESENT identity TD
| | PAYER/PAYEE.INFO.IDENTITY.TYPE MUST BE PRESENT | | | TD |
| --- | ----------------------------------------------- | --- | --- | --- |
I03 type
MINLEGTH 1 MAXLENGTH 20
| | | | | TD |
| --- | --- | --- | --- | --- |
PAYER/PAYEE .INFO.IDENTITY VERIFIEDNAME MUST BE PRESENT
| I04 | | | verifiedName | |
| ---- | --- | --- | ------------- | --- |
ALPHANUMERIC MINLEGTH 1 MAXLENGTH 99
| | PAYER/PAYEE .INFO.RATING WHITELISTED MUST BE PRESENT | | | TD |
| --- | ----------------------------------------------------- | --- | --- | --- |

| I05 | MINLEGTH 1 MAXLENGTH 5 |     | verifiedAddress |     |
| --- | ---------------------- | --- | --------------- | --- |

BUSINESS VALIDATION: ELEMENT <INFO/> TAG IS NOT MANDATORY BUT WILL BE VALIDATED IF GIVEN. INFO ELEMENT IS GIVEN ALL ATTRIBUTES ARE
REQUIRED. PAYER/PAYEE INCLUDED IN THE MESSAGES WILL COME DEPENDING UPON THEIR TYPE DURING VALIDATION.
TD
| D01 | PAYER/PAYEE.DEVICE MUST BE PRESENT | <Device/> | | |
| ---- | ----------------------------------------- | ---------- | --- | --- |
| D02 | PAYER/PAYEE. DEVICE.TAGS MUST BE PRESENT | | | TD |
D03 PAYER/PAYEE.TAG.DEVICE.NAME/VALUE MUST BE PRESENT name/value TD
TD
| D04 - D11 | SAME VALIDATION MESSAGE BASED ON DEVICE TYPE | | | |
| ---------- | --------------------------------------------- | --- | --- | --- |
TD
| D12 | TELECOM VALUE MUST BE MINLENGTH 1 MAXLENGTH 99 | | | |
| ---- | ----------------------------------------------- | --- | --- | --- |
BD
| D13 | TELECOM TAG IS ALLOWED ONLY FOR TYPE=USDC/USDB | | | |
| ---- | ----------------------------------------------- | --- | --- | --- |
BUSINESS VALIDATION: ELEMENT < DEVICE /> TAG IS MANDATORY FOR PAYER AND PAYEE FOR RESPECTIVELY PAY AND COLLECT TRANSACTION. IF
DEVICE TAG IS GIVEN WHERE IT IS NOT MANDATORY IT WILL BE VALIDATED. PAYER/PAYEE INCLUDED IN THE MESSAGES WILL COME DEPENDING UPON
THEIR TYPE DURING VALIDATION.
| A01 | PAYER/PAYEE.AC MUST BE PRESENT | < Ac/> | | TD |
| ---- | ----------------------------------------- | ------- | --------- | --- |
| | | | | TD |
| A02 | PAYER/PAYEE .AC.ADDRTYPE MUST BE PRESENT | | addrType | |
| A03 | PAYER/PAYEE .AC.DETAIL MUST BE PRESENT | | detail | TD |
| A04 | PAYER/PAYEE .AC.NAME MUST BE PRESENT | | name | TD |

UPI Error and Response Codes

PAYER/PAYEE .AC.DETAIL.AADHAR MUST BE PRESENT OR NOT TD
A05
VALID
PAYER/PAYEE .AC.DETAIL.ACCOUNTMUST BE PRESENT OR NOT TD
A06
VALID
A07 PAYER/PAYEE .AC.DETAIL.MOBILE MUST BE PRESENT OR NOT VALID TD
A08 PAYER/PAYEE .AC.DETAIL.CARD MUST BE PRESENT OR NOT VALID TD
TD
A09 PAYER/PAYEE .AC.DETAIL.VALUE INCORRECT FORMAT FOR / NAME
A10 PAYER/PAYEE .AC.DETAIL.VALUE MUST BE PRESENT FOR / NAME TD
| PAYER/PAYEE AADHAAR BASED TRANSACTIONS ARE NOT | | | BD |
| ----------------------------------------------- | --- | --- | --- |
A11
SUPPORTED PRESENTLY
PAYER/PAYEE IFSC BASED TRANSACTIONS ARE NOT SUPPORTED BD
A12
PRESENTLY
PAYER/PAYEE MMID BASED TRANSACTIONS ARE NOT SUPPORTED BD
A13
PRESENTLY
PAYER/PAYEE CARD BASED TRANSACTIONS ARE NOT SUPPORTED BD
| | | | |
| --- | --- | --- | --- |
A14
PRESENTLY
BUSINESS VALIDATION: ELEMENT < AC /> TAG IS MANDATORY FOR PAYER AND PAYEE FOR RESPECTIVELY PAY AND COLLECT TRANSACTION.
IF AC TAG IS GIVEN WHERE IT IS NOT MANDATORY IT WILL BE VALIDATED.FOR PAY TRANSACTIONIF CREDENTIAL IS PREAPPROVED AC NOT REQ UIRED
FOR PAYER. AC VALIDATION IS DONE BASED ON AADHAR ACCOUNT MOBILE CARD. PAYER/PAYEE INCLUDED IN THE MESSAGES WILL COME
DEPENDING UPON THEIR TYPE DURING VALIDATION.
| C01 PAYER/PAYEE .CREDS NOT PRESENT | <Creds/> | | TD |
| --------------------------------------------- | --------- | --- | --- |
| C02 PAYER/PAYEE .CREDS.CRED MUST BE PRESENT | | | TD |
| | | | TD |
C03 PAYER/PAYEE.CRED DATA IS WRONG
TD
| C04 PAYER/PAYEE .CRED.AADHAR MUST BE PRESENT | | | |
| ---------------------------------------------- | --- | --- | --- |
| C05 PAYER/PAYEE .CRED.OTP MUST BE PRESENT | | | TD |
| | | | TD |
C06 PAYER/PAYEE .CRED.PIN MUST BE PRESENT
| C07 PAYER/PAYEE .CRED.CARD MUST BE PRESENT | | | TD |
| --------------------------------------------------- | --- | --- | --- |
| C08 PAYER/PAYEE .CRED.PREAPPROVED MUST BE PRESENT | | | TD |
TD
| C09 PAYER/PAYEE .CRED.DATA MUST BE PRESENT | | | |
| -------------------------------------------- | --- | --- | --- |
PAYER/PAYEE .CRED.DATA ENCRYPTED AUTHENTICATION MUST BE TD
C10
PRESENT

UPI Error and Response Codes

|     |                                                    |     |     | TD  |
| --- | -------------------------------------------------- | --- | --- | --- |
| C11 | PAYER/PAYEE.CRED. SHOULD NOT BE SENT               |     |     |     |
|     | PAYER/PAYEE.CRED.CODE SHOULD NOT BE PRESENT AND BE |     |     | TD  |

C12
EITHER NPCI OR UIDAI
BUSINESS VALIDATION: ELEMENT < CREDS /> TAG IS MANDATORY FOR PAYER FOR COLLECT TRANSACTION. IF CREDS TAG IS GIVEN WHERE IT IS NOT
MANDATORY, IT WILL BE VALIDATED. PAYER/PAYEE INCLUDED IN THE MESSAGES WILL COME DEPENDING UPON THEIR TYPE DURING VALIDATION.
| V01 | PAYER/PAYEE. AMOUNT MUST BE PRESENT | < Amount/> | | TD |
| ---- | ------------------------------------ | ----------- | --- | --- |
TD
| V02 | PAYER/PAYEE .AMOUNT.CUR MUST BE PRESENT | | curr | |
| ---- | --------------------------------------------------- | --- | ----- | --- |
| | PAYER/PAYEE. AMOUNT.VALUE MUST BE WITHIN 18 DIGITS | | | TD |
V03 value
INCLUDING 2 DECIMAL
| V04 | PAYER/PAYEE .AMOUNT.SPLIT.NAME MUST BE PRESENT | | | TD |
| ---- | ------------------------------------------------ | --- | --- | --- |
| | PAYER/PAYEE .AMOUNT.SPLIT.VALUE MUST BE PRESENT | | | TD |
V05
MINLENGTH 1, MAXLENGTH 18
| M01 | PAYEE.AMOUNT.CUR MUST BE CONSISTENT | | | TD |
| ---- | -------------------------------------- | --- | --- | --- |
| | PAYER.AMOUNT.CUR MUST BE MATCHED WITH | | | TD |
M02
PAYEE.AMOUNT.CUR
| M03 | PAYER & PAYEE TOTAL AMOUNT NOT MATCHING | | | TD |
| ---- | ---------------------------------------- | --- | --- | --- |
| M04 | ONE OR MORE PAYEE AMOUNT IS MISSING | | | TD |
BUSINESS VALIDATION: ELEMENT < AMOUNT /> TAG IS MANDATORY FOR BOTH PAYER & PAYEE. IT CHECKS CURRENCY & AMOUNT MATCHING FOR
PAYER & PAYEE. PAYER/PAYEE INCLUDED IN THE MESSAGES WILL COME DEPENDING UPON THEIR TYPE DURING VALIDATION.
PM0 MERCHANT TAG IS MANDATORY IF PAYER/PAYEE IS ENTITY <Merchant/> TD
| | PAYER/PAYEE.MERCHANT.IDENTIFIER.SUBCODE MUST BE OF | | | TD |
| ---- | --------------------------------------------------- | -------------- | -------- | --- |
| PM1 | | <Identifier/> | subCode | |
LENGTH 4
PAYER/PAYEE.MERCHANT.IDENTIFIER.MID MUST BE OF MINLENGTH TD

PM2 mid
1 MAXLENGTH 20
PAYER/PAYEE.MERCHANT.IDENTIFIER.SID MUST BE OF MINLENGTH TD
PM3 sid
1 MAXLENGTH 20
PAYER/PAYEE.MERCHANT.IDENTIFIER.TID MUST BE OF MINLENGTH TD
PM4 tid
1 MAXLENGTH 20
| | PAYER/PAYEE.MERCHANT.NAME.BRAND MUST BE OF MINLENGTH | | | TD |
| ---- | ----------------------------------------------------- | -------- | ------ | --- |
| PM5 | | <Name/> | brand | |
1 MAXLENGTH 20
| | PAYER/PAYEE.MERCHANT.NAME.LEGAL MUST BE OF MINLENGTH 1 | | | TD |
| --- | ------------------------------------------------------- | --- | --- | --- |

PM6 legal
MAXLENGTH 20
| | PAYER/PAYEE.MERCHANT.NAME.FRANCHISE MUST BE OF | | | TD |
| ---- | ----------------------------------------------- | --- | ---------- | --- |
| PM7 | | | franchise | |
MINLENGTH 1 MAXLENGTH 20

UPI Error and Response Codes
PM8 PAYER/PAYEE.MERCHANT.OWNERSHIP MUST BE PRESENT <Ownership/> TD
PM9 PAYER/PAYEE.MERCHANT.OWNERSHIP.TYPE MUST BE PRESENT type TD
MERCHANT TAG SHOULD NOT BE PRESENT IF PAYER/PAYEE IS TD
PN0 <Merchant/>
PERSON
PAYER/PAYEE.MERCHANT.IDENTIFIER.MERCHANT.TYPE MUST BE TD
PN1 type
VALID
PN2 PAYER.MERCHANT.TYPE MUST BE PRESENT AMONG SMALL|LARGE type TD
BUSINESS VALIDATION: ELEMENT <MERCHANT/> TAG IS NOT MANDATORY FOR BOTH PAYER & PAYEE. IT GIVES MERCHANT’S DETAILS USING
INTERMEDIATE GATEWAY. IF MERCHANTTAG IS GIVEN, OWNERSHIP TAG AND OWNERSHIP TYPE IS MANDATORY.

UPI Error and Response Codes

4.3.2 API : RespPay

Error Code Message Details Element/ TAG Name Attribute TD/BD
TD
| H02 | VER NUMERIC/DECIMAL MIN LENGTH 1 MAX LENGTH 6 | | | Ver | |
| ---- | ---------------------------------------------- | --- | --- | ------ | --- |
| H03 | TS MUST BE ISO_ZONE FORMAT | | | ts | TD |
| | | | | | TD |
| H06 | MSGID MUST BE PRESENT MAXLENGTH 35 | | | msgId | |
TD
| U17 | PSP IS NOT REGISTERED | | | orgId | |
| ---- | ---------------------- | -------- | --- | ------ | --- |
| U52 | PSP ORGID NOT FOUND | <Head/> | | orgId | TD |
BUSINESS VALIDATION: API EXPECTED TO HAVE <HEAD/> ELEMENT. ATTRIBUTE VER & TS WILL BE VALIDATED IF CONTAINS DATA. ATTRIBUTE ORGID IS
REQUIRED AND HAS TO BE REGISTERED WITH NPCI. ATTRIBUTE MSGID IS REQUIRED.
| T01 | TXN NOT PRESENT | <Txn/> | | | TD |
| ---- | ---------------- | ------- | --- | --- | --- |
TD
| T02 | TXN.ID MUST BE PRESENT MAXLENGTH 35 | | | id | |
| ---- | ------------------------------------ | --- | --- | --- | --- |
T03 TXN.NOTE ALPHANUMERIC; MINLENGTH 1 MAXLENGTH 50 note TD
T04 TXN.REFID ALPHANUMERIC; MINLENGTH 1 MAXLENGTH 35 refId TD
| T06 | TXN.TS MUST BE ISO_ZONE FORMAT | | | ts | TD |
| ---- | ------------------------------- | --- | --- | ----- | --- |
| T07 | TXN.TYPE MUST BE PRESENT/VALID | | | type | TD |
TD
| T13 | TXN.SUBTYPE MUST BE PRESENT | <Ref/> | | subtype | |
| ---- | ---------------------------- | ------- | --- | -------- | --- |
TD
| T14 | TXN.PURPOSE MUST BE PRESENT/VALID | | | purpose | |
| ---- | ---------------------------------- | --- | --- | -------- | --- |
IM0 INITIATIONMODE SHOULD BE PRESENT AND VALUE(00-24) initiationMode TD
BUSINESS VALIDATION: ELEMENT <TXN/> TAG IS MANDATORY AND HAS TO BE PROVIDED WITH VALID DATA. ATTRIBUTE ID & TYPE ARE MANDATORY.
OTHER ATTRIBUTES WILL BE VALIDATED IN DATA GIVEN. TXN ELEMENT HAS RISKSCORES ELEMENTS REFERRED INSIDE.
| | TXN RISKSCORE PROVIDER MUST BE PRESENT ALPHANUMERIC; | | | | TD |
| ---- | ----------------------------------------------------- | --------------- | --- | --------- | --- |
| TR1 | | < RiskScores/> | | provider | |
MINLENGTH 1 MAXLENGTH 20
| | TXN RISKSCORE TYPE MUST BE PRESENT ALPHANUMERIC; | | | | TD |
| ---- | ------------------------------------------------- | --- | --- | ----- | --- |
| TR2 | | | | type | |
MINLENGTH 1 MAXLENGTH 20
TXN RISKSCORE VALUE MUST BE PRESENT NUMERIC; MINLENGTH 1
| | | | | | TD |
| ---- | --- | --- | --- | ------ | --- |
| TR3 | | | | value | |
MAXLENGTH 5
BUSINESS VALIDATION: ELEMENT < RISKSCORES /> TAG IS NOT MANDATORY BUT WILL BE VALIDATED IF GIVEN.
| E01 | <RESP> MUST BE PRESENT | < Resp/> | | | TD |
| ---- | ----------------------- | --------- | --- | --- | --- |

UPI Error and Response Codes

|     |                                          |     |          | TD  |
| --- | ---------------------------------------- | --- | -------- | --- |
| E02 | RESP.MSGID MUST BE PRESENT MAXLENGTH 35  |     | reqMsgId |     |
|     | RESP.RESULT MUST BE PRESENT ALPHANUMERIC |     |          | TD  |
| E03 |                                          |     | result   |     |

MIN LENGTH 1 MAX LENGTH 20
| | | | | TD |
| ---- | ------------------------------------- | --- | -------- | --- |
| E04 | RESP.ERRORCODE MUST BE PRESENT | | errCode | |
| E05 | RESP.ERRORCODE SHOULD NOT BE PRESENT | | errCode | TD |
E06 RESP.ERRORCODE MUST BE SUCCESS OR FAILURE result TD
TD
| E07 | TYPE IS MANDATORY & ALPHANUMERIC | <Ref/> | type | |
| ---- | --------------------------------- | ------- | ------- | --- |
| E08 | SEQNUM IS MANDATORY & NUMERIC | | seqNum | TD |
| E09 | ADDR IS MANDATORY & ALPHANUMERIC | | addr | TD |
TD
| E10 | SETTLEAMOUNT IS MANDATORY & DECIMAL | | settAmount | |
| ---- | ------------------------------------ | --- | ------------- | --- |
| E11 | SETTLECURRENCY IS MANDATORY & TEXT | | settCurrency | TD |
| | | | | TD |
| E12 | APPROVALNUM IS MANDATORY & TEXT | | approvalNum | |
TD
E13 RESPCODE IS MANDATORY & ALPHANUMERIC AND MUST BE VALID respCode
E14 SETTLEAMOUNT OF FAILURE CASES CANNOT BE MORE THAN ZERO settleAmount TD
| | | | | TD |
| ---- | ----------------------------------- | --- | --------- | --- |
| E15 | INVALID RESPONSE CODE FOR THIS API | | respCode | |
E16 REF.ACNUM MUST BE OF MINLENGTH 1 MAXLENGTH 16 acNum BD
| E17 | REF.CODE MUST BE OF LENGTH 4 | | code | TD |
| ---- | ------------------------------ | --- | -------- | --- |
| | REF.IFSC MUST BE OF LENGTH 11 | | | BD |
| E18 | | | ifsc | |
| E19 | REF.ACCTYPE MUST BE PRESENT | | accType | TD |
BUSINESS VALIDATION: ELEMENT < RESP /> TAG IS MANDATORY. ATTRIBUTE MSGID AND RESULT ARE MANDATORY.
ERRCODE IS MANDATORY IF RESULT IS FAILURE. REF TAG IS REFERED INSIDE RESP. IF REF ELEMENT IS GIVEN THEN THIS TAG WILL BE VALIDATED. ALL REF
ATTRIBUTES ARE MANDATORY.

UPI Error and Response Codes

| 4.3.3 | Meta API : ReqListPsp |     |     |     |
| ----- | --------------------- | --- | --- | --- |

Error Code Message Details Element/ TAG Name Attribute TD/BD
BD
| U17 | PSP IS NOT REGISTERED | <Head/> | orgId | |
| ---- | ---------------------- | -------- | ------ | --- |
TD
| U52 | PSP ORGID NOT FOUND | <Head/> | orgId | |
| ---- | -------------------- | -------- | ------ | --- |
Z02 VER NUMERIC/DECIMAL MIN LENGTH 1 MAX LENGTH 6 <Head/> ver TD
TD
| Z03 | TS MUST BE ISO_ZONE FORMAT | <Head/> | ts | |
| ---- | ----------------------------------- | -------- | ------ | --- |
| Z06 | MSGID MUST BE PRESENT MAXLENGTH 35 | <Head/> | msgId | TD |
BUSINESS VALIDATION: API EXPECTED TO HAVE <HEAD/> ELEMENT. ATTRIBUTE VER & TS WILL BE VALIDATED IF CONTAINS DATA. ATTRIBUTE ORGID IS
REQUIRED AND HAS TO BE REGISTERED WITH NPCI. ATTRIBUTE MSGID IS REQUIRED.

UPI Error and Response Codes

| 4.3.4 | Meta API : ReqSetCre |     |     |     |     |
| ----- | -------------------- | --- | --- | --- | --- |

Error Code Message Details Element/ TAG Name Attribute TD/BD
BD
| U17 | PSP IS NOT REGISTERED | <Head/> | | orgId | |
| ---- | ---------------------- | -------- | --- | ------ | --- |
| U52 | PSP ORGID NOT FOUND | <Head/> | | orgId | TD |
TD
Z02 VER NUMERIC/DECIMAL MIN LENGTH 1 MAX LENGTH 6 <Head/> ver
TD
| Z03 | TS MUST BE ISO_ZONE FORMAT | <Head/> | | ts | |
| ---- | ----------------------------------- | -------- | --- | ------ | --- |
| Z06 | MSGID MUST BE PRESENT MAXLENGTH 35 | <Head/> | | msgId | TD |
BUSINESS VALIDATION: API EXPECTED TO HAVE <HEAD/> ELEMENT. ATTRIBUTE VER & TS WILL BE VALIDATED IF CONTAINS DATA.
ATTRIBUTE ORGID IS REQUIRED AND HAS TO BE REGISTERED WITH NPCI. ATTRIBUTE MSGID IS REQUIRED.
| P01 | PAYER NOT PRESENT | < Payer/> | | | TD |
| ---- | ------------------------------------------- | ---------- | --- | ----- | --- |
| | | | | | TD |
| P02 | PAYER.ADDR MUST BE VALID VPA MAXLENGTH 255 | | | addr | |
P03 PAYER.NAME ALPHANUMERIC MINLEGTH 1 MAXLENGTH 99 name TD
P04 PAYER.SEQNUM NUMERIC MINLEGTH 1 MAXLENGTH 3 seqNum TD
TD
| P05 | PAYER.TYPE MUST BE PRESENT/VALID | | | type | |
| ---- | --------------------------------- | --- | --- | ----- | --- |

UPI Error and Response Codes

UPI Error and Response Codes

BUSINESS VALIDATION: ELEMENT < NEWCRED /> TAG IS MANDATORY.

| 4.3.5 | Meta API : ReqChkTxn |     |     |     |     |
| ----- | -------------------- | --- | --- | --- | --- |

Error Code Message Details Element/ TAG Name Attribute TD/BD
BD
| U17 | PSP IS NOT REGISTERED | <Head/> | | orgId | |
| ---- | ---------------------- | -------- | --- | ------ | --- |
TD
| U52 | PSP ORGID NOT FOUND | <Head/> | | orgId | |
| ---- | -------------------- | -------- | --- | ------ | --- |
Z02 VER NUMERIC/DECIMAL MIN LENGTH 1 MAX LENGTH 6 <Head/> ver TD
TD
| Z03 | TS MUST BE ISO_ZONE FORMAT | <Head/> | | Ts | |
| ---- | ----------------------------------- | -------- | --- | ------ | --- |
| Z06 | MSGID MUST BE PRESENT MAXLENGTH 35 | <Head/> | | msgId | TD |
BUSINESS VALIDATION: API EXPECTED TO HAVE <HEAD/> ELEMENT. ATTRIBUTE VER & TS WILL BE VALIDATED IF CONTAINS DATA.
ATTRIBUTE ORGID IS REQUIRED AND HAS TO BE REGISTERED WITH NPCI. ATTRIBUTE MSGID IS REQUIRED.
| X01 | TXN NOT PRESENT | <Txn/> | | | TD |
| ---- | ---------------- | ------- | --- | --- | --- |
TD
| X02 | TXN.ID MUST BE PRESENT MAXLENGTH 35 | | | id | |
| ---- | ------------------------------------ | --- | --- | --- | --- |
X03 TXN.NOTE ALPHANUMERIC; MINLENGTH 1 MAXLENGTH 50 note TD
| | | | | | TD |
| --- | --- | --- | --- | --- | --- |
X04 TXN.REFID ALPHANUMERIC; MINLENGTH 1 MAXLENGTH 35 refId
TD
| X06 | TXN.TS MUST BE ISO_ZONE FORMAT | | | ts | |
| ---- | ------------------------------- | --- | ----------- | ----- | --- |
| X07 | TXN.TYPE MUST BE PRESENT/VALID | | | type | TD |
| | | | | | TD |
| X08 | TXN.ORGTXNDATE MUST BE PRESENT | | orgTxnDate | | |
X09 TXN.ORGTXNDATE SHOULD BE WITHIN 90 DAYS orgTxnDate TD
IM0 INITIATIONMODE SHOULD BE PRESENT AND VALUE(00-14) initiationMode TD
| | | | | | TD |
| ---- | ------------------------------------------- | --- | --- | ---- | --- |
| T16 | IF SUBTYPE = MANDATE, THENUMN IS MANDATORY | | | umn | |
BUSINESS VALIDATION: ELEMENT <TXN/> TAG IS MANDATORY. ATTRIBUTE ID & TYPE ARE MANDATORY. OTHER ATTRIBUTES WILL BE VALIDATED IN
DATA GIVEN.

UPI Error and Response Codes

4.4 Errors from UPI Service Layer

TD/BD
API Error Code Description
| M16 | AI MODEL DECLINE | BD |
| ---- | -------------------------- | --- |
| U01 | THE REQUEST IS DUPLICATE | TD |
| U02 | AMOUNT CAP IS EXCEEDED | BD |
| U03 | NET DEBIT CAP IS EXCEEDED | |
BD
| U04 | REQUEST IS NOT FOUND | TD |
| ---- | ------------------------ | --- |
| U05 | FORMATION IS NOT PROPER | TD |

UPI Error and Response Codes

| U06 | TRANSACTION ID IS MISMATCHED | TD  |
| --- | ---------------------------- | --- |
| U07 | VALIDATION ERROR             | TD  |
| U08 | SYSTEM EXCEPTION             |     |

TD
| U09 | REQAUTH TIME OUT FOR PAY | TD |
| ---- | --------------------------- | --- |
| U10 | ILLEGAL OPERATION | BD |
| U11 | CREDENTIALS IS NOT PRESENT | |
BD
| U12 | AMOUNT OR CURRENCY MISMATCH | TD |
| ---- | ---------------------------- | --- |
| U13 | EXTERNAL ERROR | TD |
| U14 | ENCRYPTION ERROR | |
TD
| U15 | CHECKSUM FAILED | TD |
| ---- | ------------------------ | --- |
| U16 | RISK THRESHOLD EXCEEDED | BD |
| U17 | PSP IS NOT REGISTERED | |
BD
U18 REQUEST AUTHORISATION ACKNOWLEDGEMENT IS NOT RECEIVED TD
| U19 | REQUEST AUTHORISATION IS DECLINED | BD |
| ---- | ----------------------------------- | --- |
| U20 | REQUEST AUTHORISATION TIMEOUT | TD |
| U21 | REQUEST AUTHORISATION IS NOT FOUND | TD |
| U22 | CM REQUEST IS DECLINED | |
TD
| U23 | CM REQUEST TIMEOUT | TD |
| ---- | ------------------------------------------- | --- |
| U24 | CM REQUEST ACKNOWLEDGEMENT IS NOT RECEIVED | TD |
| U25 | CM URL IS NOT FOUND | TD |
U26 PSP REQUEST CREDIT PAY ACKNOWLEDGEMENT IS NOT RECEIVED TD
| U27 | NO RESPONSE FROM PSP | TD |
| ---- | ---------------------------- | --- |
| U28 | REMITTER BANK NOT AVAILABLE | |
TD
NA
| U29 | ADDRESS RESOLUTION IS FAILED | |
| ---- | ----------------------------- | --- |
| U30 | DEBIT HAS BEEN FAILED | NA |
| U31 | CREDIT HAS BEEN FAILED | NA |

UPI Error and Response Codes

| U32 | CREDIT REVERT HAS BEEN FAILED     | TD  |
| --- | --------------------------------- | --- |
| U33 | DEBIT REVERT HAS BEEN FAILED      | TD  |
| U34 | REVERTED                          | NA  |
| U35 | RESPONSE IS ALREADY BEEN RECEIVED | TD  |
| U36 | REQUEST IS ALREADY BEEN SENT      | TD  |
| U37 | REVERSAL HAS BEEN SENT            |     |

TD
| U38 | RESPONSE IS ALREADY BEEN SENT | TD |
| ---- | ----------------------------------- | --- |
| U39 | TRANSACTION IS ALREADY BEEN FAILED | TD |
| U40 | IMPS PROCESSING FAILED IN UPI | |
TD
| U41 | IMPS IS SIGNED OFF | TD |
| ---- | ------------------------------------------- | --- |
| U42 | IMPS TRANSACTION IS ALREADY BEEN PROCESSED | TD |
| U43 | IMPS IS DECLINED | NA |
| U44 | FORM HAS BEEN SIGNED OFF | TD |
| U45 | FORM PROCESSING HAS BEEN FAILED IN UPI | TD |
| U46 | REQUEST CREDIT IS NOT FOUND | TD |
| U47 | REQUEST DEBIT IS NOT FOUND | TD |
| U48 | TRANSACTION ID IS NOT PRESENT | |
TD
| U49 | REQUEST MESSAGE ID IS NOT PRESENT | TD |
| ---- | --------------------------------------------------- | --- |
| U50 | IFSC IS NOT PRESENT | BD |
| U51 | REQUEST REFUND IS NOT FOUND | TD |
| U52 | PSP ORGID NOT FOUND | BD |
| U53 | PSP REQUEST PAY DEBIT ACKNOWLEDGEMENT NOT RECEIVED | TD |
U54 TRANSACTION ID OR AMOUNT IN CREDENTIAL BLOCK DOES NOT MATCH WITH THAT IN REQPAY
TD
| U55 | MESSAGE INTEGRITY FAILED DUE TO ORGID MISMATCH | TD |
| ---- | ----------------------------------------------- | --- |
| U56 | NUMBER OF PAYEES DIFFERS FROM ORIGINAL REQUEST | TD |
| U57 | PAYEE AMOUNT DIFFERS FROM ORIGINAL REQUEST | |
TD

UPI Error and Response Codes

| U58 | PAYER AMOUNT DIFFERS FROM ORIGINAL REQUEST  | TD  |
| --- | ------------------------------------------- | --- |
| U59 | PAYEE ADDRESS DIFFERS FROM ORIGINAL REQUEST | TD  |
| U60 | PAYER ADDRESS DIFFERS FROM ORIGINAL REQUEST |     |

TD
| U61 | PAYEE INFO DIFFERS FROM ORIGINAL REQUEST | TD |
| ---- | ----------------------------------------- | --- |
| U62 | PAYER INFO DIFFERS FROM ORIGINAL REQUEST | TD |
| U63 | DEVICE REGISTRATION FAILED IN UPI | |
TD
U64 DATA TAG SHOULD CONTAIN 4 PARTS DURING DEVICE REGISTRATION TD
U65 CREDS BLOCK SHOULD CONTAIN CORRECT ELEMENTS DURING DEVICE REGISTRATION TD
| U66 | DEVICE FINGERPRINT MISMATCH | BD |
| ---- | ---------------------------- | --- |
| U67 | DEBIT TIMEOUT | TD |
| U68 | CREDIT TIMEOUT | |
TD
| U69 | COLLECT EXPIRED | BD |
| ---- | ----------------------- | --- |
| U70 | RECEIVED LATE RESPONSE | |
TD
| U71 | MERCHANT CREDIT NOT SUPPORTED IN IMPS | TD |
| ---- | -------------------------------------- | --- |
| U72 | VAE FAILED | TD |
| U74 | PAYER ACCOUNT MISMATCH | TD |
| U75 | PAYEE ACCOUNT MISMATCH | TD |
U76 MOBILE BANKING REGISTRATION FORMAT NOT SUPPORTED BY THE ISSUER BANK TD
| U77 | MERCHANT BLOCKED | TD |
| ---- | ------------------------- | --- |
| U78 | BENEFICIARY BANK OFFLINE | |
TD
| U80 | PAYER PSP THROTTLE DECLINE | TD |
| ---- | -------------------------------------- | --- |
| U81 | REMITTER BANK DEEMED CHECK DECLINE | TD |
| U82 | READ TIMEOUT IN REQPAY CREDIT | TD |
| U84 | BENEFICIARY BANK DEEMED CHECK DECLINE | TD |
| U85 | CONNECTION TIMEOUT IN REQPAY DEBIT | TD |
TD
| U86 | REMITTER BANK THROTTLING DECLINE | |
| ---- | --------------------------------- | --- |

UPI Error and Response Codes

TD
| U87 | READ TIMEOUT IN REQPAY DEBIT | |
| ---- | ------------------------------------ | --- |
| U88 | CONNECTION TIMEOUT IN REQPAY CREDIT | TD |
| U89 | BENEFICIARY BANK THROTTLING DECLINE | TD |
TD
| U90 | REMITTER BANK DEEMED HIGH RESPONSE TIME CHECK DECLINE | |
| ---- | ------------------------------------------------------ | --- |
U91 BENEFICIARY BANK DEEMED HIGH RESPONSE TIME CHECK DECLINE TD
| U92 | PAYER PSP NOT AVAILABLE | TD |
| ---- | ------------------------ | --- |
TD
| U93 | PAYEE PSP NOT AVAILABLE | |
| ---- | ----------------------------------------- | --- |
| U94 | PAYEE PSP THROTTLE DECLINE | TD |
| U95 | PAYEE VPA AADHAAR OR IIN VPA IS DISABLED | BD |
BD
| U96 | PAYER AND PAYEE IFSC/ACNUM CAN'T BE SAME | |
| ---- | ---------------------------------------------- | --- |
| U97 | PSP REQUEST META ACKNOWLEDGEMENT NOT RECEIVED | TD |
| U98 | NULL ACK RECEIVED BY UPI FOR META TRANSACTION | TD |
TD
| U99 | NEGATIVE ACK RECEIVED BY UPI FOR META TRANSACTION | |
| ---- | -------------------------------------------------- | --- |
| S93 | PAYEE_PSP_THROTTLE_DECLINE_OUTGOING_COUNT | TD |
TD
| S94 | PAYEE_PSP_THROTTLE_DECLINE_RESPONSE_TIME | |
| ---- | ----------------------------------------- | --- |
| S95 | BENEFICIARY_DISPATCH_FAILED | |
| S96 | REMITTER_DISPATCH_FAILED | |

| S97 | ADD_RESLN_DISPATCH_FAILED |     |
| --- | ------------------------- | --- |
| S98 | ISSUER_DISPATCH_FAILED    |     |
| HS1 | HSM_OFFINE                |     |

| HS2 | HSM_TIMEOUT             |     |
| --- | ----------------------- | --- |
| HS3 | HSM_COMMUNICATION_ERROR |     |

UPI Error and Response Codes
