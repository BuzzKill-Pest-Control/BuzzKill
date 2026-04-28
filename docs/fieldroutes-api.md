# FieldRoutes API Documentation

Source: https://api.fieldroutes.com/documentation
Exported: 2026-04-28T02:13:48.631Z

---

## Table of Contents

- [/accessControl/[id]](#documentation_accessControlGetID)
- [/accessControl/get](#documentation_accessControlGetBulk)
- [/accessControl/search](#documentation_accessControlSearch)
- [/additionalContact/[id]](#documentation_additionalContactGetID)
- [/additionalContact/create](#documentation_additionalContactCreate)
- [/additionalContact/get](#documentation_additionalContactGetBulk)
- [/additionalContact/search](#documentation_additionalContactSearch)
- [/applicationMethod/[id]](#documentation_applicationMethodGetID)
- [/applicationMethod/get](#documentation_applicationMethodGetBulk)
- [/applicationMethod/search](#documentation_applicationMethodSearch)
- [/appliedPayment/[id]](#documentation_appliedPaymentGetID)
- [/appliedPayment/get](#documentation_appliedPaymentGetBulk)
- [/appliedPayment/search](#documentation_appliedPaymentSearch)
- [/appointment/[id]](#documentation_appointmentGetID)
- [/appointment/cancel](#documentation_appointmentCancel)
- [/appointment/complete](#documentation_appointmentComplete)
- [/appointment/create](#documentation_appointmentCreate)
- [/appointment/get](#documentation_appointmentGetBulk)
- [/appointment/search](#documentation_appointmentSearch)
- [/appointment/update](#documentation_appointmentUpdate)
- [/appointmentCancellationReason/[id]](#documentation_appointmentCancellationReasonGetID)
- [/appointmentCancellationReason/get](#documentation_appointmentCancellationReasonGetBulk)
- [/appointmentCancellationReason/search](#documentation_appointmentCancellationReasonSearch)
- [/appointmentReminder/[id]](#documentation_appointmentReminderGetID)
- [/appointmentReminder/create](#documentation_appointmentReminderCreate)
- [/appointmentReminder/get](#documentation_appointmentReminderGetBulk)
- [/appointmentReminder/search](#documentation_appointmentReminderSearch)
- [/appointmentReminder/update](#documentation_appointmentReminderUpdate)
- [/appointmentRescheduleReason/[id]](#documentation_appointmentRescheduleReasonGetID)
- [/appointmentRescheduleReason/get](#documentation_appointmentRescheduleReasonGetBulk)
- [/appointmentRescheduleReason/search](#documentation_appointmentRescheduleReasonSearch)
- [/cancellationReason/[id]](#documentation_cancellationReasonGetID)
- [/cancellationReason/get](#documentation_cancellationReasonGetBulk)
- [/cancellationReason/search](#documentation_cancellationReasonSearch)
- [/changelog/[id]](#documentation_changelogGetID)
- [/changelog/get](#documentation_changelogGetBulk)
- [/changelog/search](#documentation_changelogSearch)
- [/chargeback/[id]](#documentation_chargebackGetID)
- [/chargeback/get](#documentation_chargebackGetBulk)
- [/chargeback/search](#documentation_chargebackSearch)
- [/chemical/[id]](#documentation_chemicalGetID)
- [/chemical/get](#documentation_chemicalGetBulk)
- [/chemical/search](#documentation_chemicalSearch)
- [/chemicalUse/[id]](#documentation_chemicalUseGetID)
- [/chemicalUse/get](#documentation_chemicalUseGetBulk)
- [/chemicalUse/search](#documentation_chemicalUseSearch)
- [/compassCustomer/[id]](#documentation_compassCustomerGetID)
- [/compassCustomer/get](#documentation_compassCustomerGetBulk)
- [/compassCustomer/search](#documentation_compassCustomerSearch)
- [/contract/[id]](#documentation_contractGetID)
- [/contract/create](#documentation_contractCreate)
- [/contract/delete](#documentation_contractDelete)
- [/contract/get](#documentation_contractGetBulk)
- [/contract/search](#documentation_contractSearch)
- [/contract/update](#documentation_contractUpdate)
- [/customer/[id]](#documentation_customerGetID)
- [/customer/create](#documentation_customerCreate)
- [/customer/createPaymentProfile](#documentation_customerCreatePaymentProfile)
- [/customer/get](#documentation_customerGetBulk)
- [/customer/search](#documentation_customerSearch)
- [/customer/update](#documentation_customerUpdate)
- [/customer/updatePaymentProfile](#documentation_customerUpdatePaymentProfile)
- [/customerFlag/[id]](#documentation_customerFlagGetID)
- [/customerFlag/get](#documentation_customerFlagGetBulk)
- [/customerFlag/search](#documentation_customerFlagSearch)
- [/customerFlag/update](#documentation_customerFlagUpdate)
- [/customerSource/[id]](#documentation_customerSourceGetID)
- [/customerSource/get](#documentation_customerSourceGetBulk)
- [/customerSource/search](#documentation_customerSourceSearch)
- [/diagram/[id]](#documentation_diagramGetID)
- [/diagram/get](#documentation_diagramGetBulk)
- [/diagram/search](#documentation_diagramSearch)
- [/diagram/update](#documentation_diagramUpdate)
- [/disbursement/[id]](#documentation_disbursementGetID)
- [/disbursement/get](#documentation_disbursementGetBulk)
- [/disbursement/search](#documentation_disbursementSearch)
- [/disbursementItem/[id]](#documentation_disbursementItemGetID)
- [/disbursementItem/get](#documentation_disbursementItemGetBulk)
- [/disbursementItem/search](#documentation_disbursementItemSearch)
- [/document/[id]](#documentation_documentGetID)
- [/document/create](#documentation_documentCreate)
- [/document/createEncoded](#documentation_documentCreateEncoded)
- [/document/delete](#documentation_documentDelete)
- [/document/get](#documentation_documentGetBulk)
- [/document/search](#documentation_documentSearch)
- [/document/update](#documentation_documentUpdate)
- [/door/[id]](#documentation_doorGetID)
- [/door/get](#documentation_doorGetBulk)
- [/door/search](#documentation_doorSearch)
- [/employee/[id]](#documentation_employeeGetID)
- [/employee/create](#documentation_employeeCreate)
- [/employee/dealias](#documentation_employeeDealias)
- [/employee/get](#documentation_employeeGetBulk)
- [/employee/reset](#documentation_employeeReset)
- [/employee/search](#documentation_employeeSearch)
- [/employee/update](#documentation_employeeUpdate)
- [/employeeLocation/[id]](#documentation_employeeLocationGetID)
- [/employeeLocation/get](#documentation_employeeLocationGetBulk)
- [/employeeLocation/search](#documentation_employeeLocationSearch)
- [/form/[id]](#documentation_formGetID)
- [/form/get](#documentation_formGetBulk)
- [/form/search](#documentation_formSearch)
- [/genericFlag/[id]](#documentation_genericFlagGetID)
- [/genericFlag/get](#documentation_genericFlagGetBulk)
- [/genericFlag/search](#documentation_genericFlagSearch)
- [/genericFlagAssignment/[id]](#documentation_genericFlagAssignmentGetID)
- [/genericFlagAssignment/create](#documentation_genericFlagAssignmentCreate)
- [/genericFlagAssignment/delete](#documentation_genericFlagAssignmentDelete)
- [/genericFlagAssignment/get](#documentation_genericFlagAssignmentGetBulk)
- [/genericFlagAssignment/search](#documentation_genericFlagAssignmentSearch)
- [/genericFlagAssignment/update](#documentation_genericFlagAssignmentUpdate)
- [/glAccount/[id]](#documentation_glAccountGetID)
- [/glAccount/get](#documentation_glAccountGetBulk)
- [/glAccount/search](#documentation_glAccountSearch)
- [/group/[id]](#documentation_groupGetID)
- [/group/create](#documentation_groupCreate)
- [/group/get](#documentation_groupGetBulk)
- [/group/search](#documentation_groupSearch)
- [/group/update](#documentation_groupUpdate)
- [/insect/[id]](#documentation_insectGetID)
- [/insect/get](#documentation_insectGetBulk)
- [/insect/search](#documentation_insectSearch)
- [/knock/[id]](#documentation_knockGetID)
- [/knock/get](#documentation_knockGetBulk)
- [/knock/search](#documentation_knockSearch)
- [/location/[id]](#documentation_locationGetID)
- [/location/get](#documentation_locationGetBulk)
- [/location/search](#documentation_locationSearch)
- [/note/[id]](#documentation_noteGetID)
- [/note/create](#documentation_noteCreate)
- [/note/delete](#documentation_noteDelete)
- [/note/get](#documentation_noteGetBulk)
- [/note/search](#documentation_noteSearch)
- [/note/update](#documentation_noteUpdate)
- [/office/[id]](#documentation_officeGetID)
- [/office/get](#documentation_officeGetBulk)
- [/office/search](#documentation_officeSearch)
- [/payment/[id]](#documentation_paymentGetID)
- [/payment/create](#documentation_paymentCreate)
- [/payment/createRefund](#documentation_paymentCreateRefund)
- [/payment/get](#documentation_paymentGetBulk)
- [/payment/search](#documentation_paymentSearch)
- [/paymentProfile/[id]](#documentation_paymentProfileGetID)
- [/paymentProfile/create](#documentation_paymentProfileCreate)
- [/paymentProfile/delete](#documentation_paymentProfileDelete)
- [/paymentProfile/get](#documentation_paymentProfileGetBulk)
- [/paymentProfile/search](#documentation_paymentProfileSearch)
- [/paymentProfile/update](#documentation_paymentProfileUpdate)
- [/product/[id]](#documentation_productGetID)
- [/product/create](#documentation_productCreate)
- [/product/get](#documentation_productGetBulk)
- [/product/search](#documentation_productSearch)
- [/product/update](#documentation_productUpdate)
- [/region/[id]](#documentation_regionGetID)
- [/region/get](#documentation_regionGetBulk)
- [/region/search](#documentation_regionSearch)
- [/reserviceReason/[id]](#documentation_reserviceReasonGetID)
- [/reserviceReason/get](#documentation_reserviceReasonGetBulk)
- [/reserviceReason/search](#documentation_reserviceReasonSearch)
- [/review/[id]](#documentation_reviewGetID)
- [/review/create](#documentation_reviewCreate)
- [/review/delete](#documentation_reviewDelete)
- [/review/get](#documentation_reviewGetBulk)
- [/review/search](#documentation_reviewSearch)
- [/review/summary](#documentation_reviewSummary)
- [/review/update](#documentation_reviewUpdate)
- [/route/[id]](#documentation_routeGetID)
- [/route/create](#documentation_routeCreate)
- [/route/delete](#documentation_routeDelete)
- [/route/get](#documentation_routeGetBulk)
- [/route/search](#documentation_routeSearch)
- [/route/update](#documentation_routeUpdate)
- [/routeTemplate/[id]](#documentation_routeTemplateGetID)
- [/routeTemplate/get](#documentation_routeTemplateGetBulk)
- [/routeTemplate/search](#documentation_routeTemplateSearch)
- [/servicePlan/[id]](#documentation_servicePlanGetID)
- [/servicePlan/create](#documentation_servicePlanCreate)
- [/servicePlan/get](#documentation_servicePlanGetBulk)
- [/servicePlan/search](#documentation_servicePlanSearch)
- [/servicePlan/update](#documentation_servicePlanUpdate)
- [/servicePlan/updateLeadStage](#documentation_servicePlanUpdateLeadStage)
- [/servicePlanRound/[id]](#documentation_servicePlanRoundGetID)
- [/servicePlanRound/get](#documentation_servicePlanRoundGetBulk)
- [/servicePlanRound/search](#documentation_servicePlanRoundSearch)
- [/servicePlanRound/update](#documentation_servicePlanRoundUpdate)
- [/serviceType/[id]](#documentation_serviceTypeGetID)
- [/serviceType/get](#documentation_serviceTypeGetBulk)
- [/serviceType/search](#documentation_serviceTypeSearch)
- [/skill/[id]](#documentation_skillGetID)
- [/skill/create](#documentation_skillCreate)
- [/skill/get](#documentation_skillGetBulk)
- [/skill/search](#documentation_skillSearch)
- [/skill/update](#documentation_skillUpdate)
- [/spot/[id]](#documentation_spotGetID)
- [/spot/block](#documentation_spotBlock)
- [/spot/get](#documentation_spotGetBulk)
- [/spot/release](#documentation_spotRelease)
- [/spot/reserve](#documentation_spotReserve)
- [/spot/search](#documentation_spotSearch)
- [/spot/unblock](#documentation_spotUnblock)
- [/subscription/[id]](#documentation_subscriptionGetID)
- [/subscription/create](#documentation_subscriptionCreate)
- [/subscription/createInitialAddOn](#documentation_subscriptionCreateInitialAddOn)
- [/subscription/delete](#documentation_subscriptionDelete)
- [/subscription/deleteInitialAddOn](#documentation_subscriptionDeleteInitialAddOn)
- [/subscription/get](#documentation_subscriptionGetBulk)
- [/subscription/getInitialAddOns](#documentation_subscriptionGetInitialAddOns)
- [/subscription/search](#documentation_subscriptionSearch)
- [/subscription/setInitialAddOns](#documentation_subscriptionSetInitialAddOns)
- [/subscription/update](#documentation_subscriptionUpdate)
- [/subscription/updateInitialAddOn](#documentation_subscriptionUpdateInitialAddOn)
- [/subscription/updateLeadStage](#documentation_subscriptionUpdateLeadStage)
- [/task/[id]](#documentation_taskGetID)
- [/task/create](#documentation_taskCreate)
- [/task/get](#documentation_taskGetBulk)
- [/task/search](#documentation_taskSearch)
- [/task/update](#documentation_taskUpdate)
- [/team/[id]](#documentation_teamGetID)
- [/team/get](#documentation_teamGetBulk)
- [/team/search](#documentation_teamSearch)
- [/ticket/[id]](#documentation_ticketGetID)
- [/ticket/create](#documentation_ticketCreate)
- [/ticket/createAddOn](#documentation_ticketCreateAddOn)
- [/ticket/delete](#documentation_ticketDelete)
- [/ticket/deleteAddOn](#documentation_ticketDeleteAddOn)
- [/ticket/get](#documentation_ticketGetBulk)
- [/ticket/getAddOns](#documentation_ticketGetAddOns)
- [/ticket/search](#documentation_ticketSearch)
- [/ticket/setAddOns](#documentation_ticketSetAddOns)
- [/ticket/update](#documentation_ticketUpdate)
- [/ticket/updateAddOn](#documentation_ticketUpdateAddOn)
- [/ticketItem/[id]](#documentation_ticketItemGetID)
- [/ticketItem/get](#documentation_ticketItemGetBulk)
- [/ticketItem/search](#documentation_ticketItemSearch)
- [/timeClock/[id]](#documentation_timeClockGetID)
- [/timeClock/get](#documentation_timeClockGetBulk)
- [/timeClock/search](#documentation_timeClockSearch)
- [/timeClockCategory/[id]](#documentation_timeClockCategoryGetID)
- [/timeClockCategory/get](#documentation_timeClockCategoryGetBulk)
- [/timeClockCategory/search](#documentation_timeClockCategorySearch)
- [/unit/[id]](#documentation_unitGetID)
- [/unit/get](#documentation_unitGetBulk)
- [/unit/search](#documentation_unitSearch)

---

## /accessControl/[id]

<a name="documentation_accessControlGetID"></a>

**Description:** Get accessControl data for single ID -- please provide a specific record ID in the URL structure.

### Parameters

- **-**

### Response

- **employeeID - integer**: Employee ID of custom Access Control Profile
- **accessControlProfileID - integer**: 0: Custom Access Control Profile per user. Otherwise, ID of defined Access Control Profiles
- **admin - integer**: Administrator
- **adminMessage - integer**: Admin Messages
- **editPreferences - integer**: Adjust Preferences
- **viewOwnRoutes - integer**: View Own Routes
- **viewOtherRoutes - integer**: View Other's Routes
- **editOwnRoutes - integer**: Edit Own Routes
- **editOtherRoutes - integer**: Edit Other's Routes
- **createRoutes - integer**: Create Routes
- **deleteRoutes - integer**: Delete Routes
- **lockUnlockRoutes - integer**: Lock/Unlock Routes
- **scheduleOnLockedRoutes - integer**: Schedule On Locked Routes
- **scheduleOwn - integer**: Schedule Appointments
- **cancelOwn - integer**: Cancel Own Appointments
- **editOthers - integer**: Edit Other's Appointments
- **canUnlockAppointments - integer**: Unlock Other's Appointments
- **intelligentRouting - integer**: Intelligent Routing
- **editMap - integer**: Assign Map Pages
- **viewProdValue - integer**: View Production Value
- **useTechRoutesStructures - integer**: Use Structures/Trend Reporting (Additional Charges Apply)
- **viewUsers - integer**: View Users
- **addUsers - integer**: Add Users
- **editUsers - integer**: Edit Users
- **viewTechs - integer**: View Techs
- **addTechs - integer**: Add Techs
- **editTechs - integer**: Edit Techs
- **viewSalesmen - integer**: View Sales Reps
- **addSalesmen - integer**: Add Sales Reps
- **editSalesmen - integer**: Edit Sales Reps
- **viewOwnTimeSheet - integer**: View Own Time Sheet
- **viewOtherTimeSheet - integer**: View Other Time Sheets
- **editOwnTimeSheet - integer**: Edit Own Time Sheet
- **editOtherTimeSheet - integer**: Edit Other Time Sheets
- **overrideTimeClockRestrictions - integer**: Override Time Clock Restrictions
- **canSpyOnReps - integer**: Rep Spy (SalesRoutes)
- **editTeams - integer**: Edit Teams
- **viewEmployeeFinancialSettings - integer**: View Employee Financial Settings
- **editEmployeeFinancialSettings - integer**: Edit Employee Financial Settings
- **viewOwnTasks - integer**: View Own Tasks
- **viewOtherTasks - integer**: View Other Tasks
- **editOwnTasks - integer**: Edit Own Tasks
- **editOtherTasks - integer**: Edit Other Tasks
- **viewAlerts - integer**: View Alerts
- **viewTransactions - integer**: View Transactions
- **addCharge - integer**: Add Charges
- **applyPayment - integer**: Apply Payments
- **editTransactions - integer**: Edit Transactions
- **processRefunds - integer**: Refund Payments
- **deleteInvoice - integer**: Delete Invoices
- **createCoupon - integer**: Create Coupon
- **invoiceNegativeItem - integer**: Negative Charges
- **closedMonthAppointmentCompletion - integer**: Complete appointment when period is locked
- **createCustomers - integer**: Create Customers
- **viewOwnCustomers - integer**: View Own Customers
- **viewOtherCustomers - integer**: View Other Customers
- **editOwnCustomers - integer**: Edit Own Customers
- **editOtherCustomers - integer**: Edit Other Customers
- **toggleCustomerStatus - integer**: Freeze/Unfreeze Customers
- **editRedNotes - integer**: Edit Red Notes
- **editCancellationDates - integer**: Edit Cancellation Date/Reason
- **toggleSubscriptionStatus - integer**: Freeze/Unfreeze Subscriptions
- **viewOwnSubscriptions - integer**: View Own Subscriptions
- **viewOtherSubscriptions - integer**: View Other Subscriptions
- **editOwnSubscriptions - integer**: Edit Own Subscriptions
- **editOtherSubscriptions - integer**: Edit Other Subscriptions
- **accessSentricon - integer**: Can Access Sentricon
- **editOwnSalesRep - integer**: Edit Own Sales Rep
- **editOtherSalesRep - integer**: Edit Other Sales Rep
- **viewLeaderBoardsAllOffices - integer**: View Leaderboards of All Offices
- **createCustomersFromMobile - integer**: Create Customers on Mobile (Additional Charges Apply)
- **viewOwnLeads - integer**: View Own Leads
- **viewOtherLeads - integer**: View Other Leads
- **editOwnLeads - integer**: Edit Own Leads
- **editOtherLeads - integer**: Edit Other Leads
- **assignBillingAccount - integer**: Assign Billing Account
- **viewOwnBilling - integer**: View Own Billing
- **viewOtherBilling - integer**: View Other Billing
- **editOwnBilling - integer**: Edit Own Billing
- **editOtherBilling - integer**: Edit Other Billing
- **addOwnBilling - integer**: Add Own Billing
- **addOtherBilling - integer**: Add Other Billing
- **approveForms - integer**: Approve Forms
- **viewOwnInvoices - integer**: View Own Invoices
- **viewOtherInvoices - integer**: View Other Invoices
- **editTaxable - integer**: Edit Taxable
- **hideCommercialPricing - integer**: Hide Commercial Price on Mobile
- **hideResidentialPricing - integer**: Hide Residential Price on Mobile
- **ignoreMinInitial - integer**: Ignore Min Initial Charge
- **ignoreMinRecurring - integer**: Ignore Min Recurring Charge
- **ignoreMinContractValue - integer**: Ignore Min Contract Value
- **viewSalesmanReports - integer**: View Sales Overview
- **viewDetailedSalesReports - integer**: View Sales Details
- **viewOfficeReports - integer**: View Office Reports
- **viewCustomReports - integer**: View Custom Reports
- **viewCustomerReport - integer**: View Customer Report
- **viewDashboard - integer**: View Dashboard
- **salesroutesBaseballRevenue - integer**: Sales Leaderboard Revenue
- **serviceNotificationApproval - integer**: Service Notification Approval
- **viewDisbursementsReport - integer**: View Disbursements Report
- **activeCustomersWidget - integer**: Active Customers
- **subscriptionTypesWidget - integer**: Active Subscriptions
- **cancelReasonsWidget - integer**: Cancellation Reasons
- **monthlyServicesWidget - integer**: Monthly Services
- **starRatingWidget - integer**: Technician Ratings
- **collectionsWidget - integer**: Collections Percentage
- **completionPercentageWidget - integer**: Completion Percentage
- **regularStopsPerRouteWidget - integer**: Stops Per Route
- **aPayCustomersWidget - integer**: Autopay Percentage
- **accountAgeWidget - integer**: Receivables Aging
- **paymentBreakdownWidget - integer**: Payment Types
- **averageRatesWidget - integer**: Average Rates
- **averageContractValuesWidget - integer**: Average Contract Values
- **customerAgeWidget - integer**: Average Customer Age
- **customerSourcesWidget - integer**: Subscription Sources
- **extraCardsWidget - integer**: Frozen with Account
- **monthlyBillingWidget - integer**: Recurring Billing
- **debitBalanceWidget - integer**: Debit Balance
- **revenueByServiceTypeWidget - integer**: Revenue by Service
- **revenueByMonthWidget - integer**: Revenue by Month
- **recurringAnnualRevenueWidget - integer**: Recurring Annual Revenue
- **accessControlProfileName - string**: Access control profile name (if this is a preset access control profile)
- **viewAssignmentLayers - integer**: View Assignment Layers
- **editAnyBoundaryRegion - integer**: Edit Any Boundary Region
- **editBoundaryRegionInManagedArea - integer**: Edit Boundaries In Managed Area
- **editAnyAssignmentRegion - integer**: Edit Any Assignment Region
- **editAssignmentRegionInManagedArea - integer**: Edit Regions In Managed Area
- **viewReportingLayers - integer**: View Reporting Layers
- **editOwnReportingRegions - integer**: Edit Own Reporting Regions
- **editOtherReportingRegions - integer**: Edit Other Reporting Regions
- **viewDataLayers - integer**: View Data Layers
- **editOwnDataLayers - integer**: Edit Own Data Layers
- **editOtherDataLayers - integer**: Edit Other Data Layers
- **viewDoorKnockSystemLayer - integer**: View Door Knock System Layer
- **viewCustomerSystemLayer - integer**: View Customer System Layer
- **viewFeedback - integer**: View Feedback
- **dateUpdated - string**: Access Control Matrix dateUpdated

---

## /accessControl/get

<a name="documentation_accessControlGetBulk"></a>

**Description:** Get Bulk data for accessControl. Accepts an array of employeeIDs. Returns a max of 1000 records.

### Parameters

- **employeeIDs - array**

### Response

- **employeeID - integer**: Employee ID of custom Access Control Profile
- **accessControlProfileID - integer**: 0: Custom Access Control Profile per user. Otherwise, ID of defined Access Control Profiles
- **admin - integer**: Administrator
- **adminMessage - integer**: Admin Messages
- **editPreferences - integer**: Adjust Preferences
- **viewOwnRoutes - integer**: View Own Routes
- **viewOtherRoutes - integer**: View Other's Routes
- **editOwnRoutes - integer**: Edit Own Routes
- **editOtherRoutes - integer**: Edit Other's Routes
- **createRoutes - integer**: Create Routes
- **deleteRoutes - integer**: Delete Routes
- **lockUnlockRoutes - integer**: Lock/Unlock Routes
- **scheduleOnLockedRoutes - integer**: Schedule On Locked Routes
- **scheduleOwn - integer**: Schedule Appointments
- **cancelOwn - integer**: Cancel Own Appointments
- **editOthers - integer**: Edit Other's Appointments
- **canUnlockAppointments - integer**: Unlock Other's Appointments
- **intelligentRouting - integer**: Intelligent Routing
- **editMap - integer**: Assign Map Pages
- **viewProdValue - integer**: View Production Value
- **useTechRoutesStructures - integer**: Use Structures/Trend Reporting (Additional Charges Apply)
- **viewUsers - integer**: View Users
- **addUsers - integer**: Add Users
- **editUsers - integer**: Edit Users
- **viewTechs - integer**: View Techs
- **addTechs - integer**: Add Techs
- **editTechs - integer**: Edit Techs
- **viewSalesmen - integer**: View Sales Reps
- **addSalesmen - integer**: Add Sales Reps
- **editSalesmen - integer**: Edit Sales Reps
- **viewOwnTimeSheet - integer**: View Own Time Sheet
- **viewOtherTimeSheet - integer**: View Other Time Sheets
- **editOwnTimeSheet - integer**: Edit Own Time Sheet
- **editOtherTimeSheet - integer**: Edit Other Time Sheets
- **overrideTimeClockRestrictions - integer**: Override Time Clock Restrictions
- **canSpyOnReps - integer**: Rep Spy (SalesRoutes)
- **editTeams - integer**: Edit Teams
- **viewEmployeeFinancialSettings - integer**: View Employee Financial Settings
- **editEmployeeFinancialSettings - integer**: Edit Employee Financial Settings
- **viewOwnTasks - integer**: View Own Tasks
- **viewOtherTasks - integer**: View Other Tasks
- **editOwnTasks - integer**: Edit Own Tasks
- **editOtherTasks - integer**: Edit Other Tasks
- **viewAlerts - integer**: View Alerts
- **viewTransactions - integer**: View Transactions
- **addCharge - integer**: Add Charges
- **applyPayment - integer**: Apply Payments
- **editTransactions - integer**: Edit Transactions
- **processRefunds - integer**: Refund Payments
- **deleteInvoice - integer**: Delete Invoices
- **createCoupon - integer**: Create Coupon
- **invoiceNegativeItem - integer**: Negative Charges
- **closedMonthAppointmentCompletion - integer**: Complete appointment when period is locked
- **createCustomers - integer**: Create Customers
- **viewOwnCustomers - integer**: View Own Customers
- **viewOtherCustomers - integer**: View Other Customers
- **editOwnCustomers - integer**: Edit Own Customers
- **editOtherCustomers - integer**: Edit Other Customers
- **toggleCustomerStatus - integer**: Freeze/Unfreeze Customers
- **editRedNotes - integer**: Edit Red Notes
- **editCancellationDates - integer**: Edit Cancellation Date/Reason
- **toggleSubscriptionStatus - integer**: Freeze/Unfreeze Subscriptions
- **viewOwnSubscriptions - integer**: View Own Subscriptions
- **viewOtherSubscriptions - integer**: View Other Subscriptions
- **editOwnSubscriptions - integer**: Edit Own Subscriptions
- **editOtherSubscriptions - integer**: Edit Other Subscriptions
- **accessSentricon - integer**: Can Access Sentricon
- **editOwnSalesRep - integer**: Edit Own Sales Rep
- **editOtherSalesRep - integer**: Edit Other Sales Rep
- **viewLeaderBoardsAllOffices - integer**: View Leaderboards of All Offices
- **createCustomersFromMobile - integer**: Create Customers on Mobile (Additional Charges Apply)
- **viewOwnLeads - integer**: View Own Leads
- **viewOtherLeads - integer**: View Other Leads
- **editOwnLeads - integer**: Edit Own Leads
- **editOtherLeads - integer**: Edit Other Leads
- **assignBillingAccount - integer**: Assign Billing Account
- **viewOwnBilling - integer**: View Own Billing
- **viewOtherBilling - integer**: View Other Billing
- **editOwnBilling - integer**: Edit Own Billing
- **editOtherBilling - integer**: Edit Other Billing
- **addOwnBilling - integer**: Add Own Billing
- **addOtherBilling - integer**: Add Other Billing
- **approveForms - integer**: Approve Forms
- **viewOwnInvoices - integer**: View Own Invoices
- **viewOtherInvoices - integer**: View Other Invoices
- **editTaxable - integer**: Edit Taxable
- **hideCommercialPricing - integer**: Hide Commercial Price on Mobile
- **hideResidentialPricing - integer**: Hide Residential Price on Mobile
- **ignoreMinInitial - integer**: Ignore Min Initial Charge
- **ignoreMinRecurring - integer**: Ignore Min Recurring Charge
- **ignoreMinContractValue - integer**: Ignore Min Contract Value
- **viewSalesmanReports - integer**: View Sales Overview
- **viewDetailedSalesReports - integer**: View Sales Details
- **viewOfficeReports - integer**: View Office Reports
- **viewCustomReports - integer**: View Custom Reports
- **viewCustomerReport - integer**: View Customer Report
- **viewDashboard - integer**: View Dashboard
- **salesroutesBaseballRevenue - integer**: Sales Leaderboard Revenue
- **serviceNotificationApproval - integer**: Service Notification Approval
- **viewDisbursementsReport - integer**: View Disbursements Report
- **activeCustomersWidget - integer**: Active Customers
- **subscriptionTypesWidget - integer**: Active Subscriptions
- **cancelReasonsWidget - integer**: Cancellation Reasons
- **monthlyServicesWidget - integer**: Monthly Services
- **starRatingWidget - integer**: Technician Ratings
- **collectionsWidget - integer**: Collections Percentage
- **completionPercentageWidget - integer**: Completion Percentage
- **regularStopsPerRouteWidget - integer**: Stops Per Route
- **aPayCustomersWidget - integer**: Autopay Percentage
- **accountAgeWidget - integer**: Receivables Aging
- **paymentBreakdownWidget - integer**: Payment Types
- **averageRatesWidget - integer**: Average Rates
- **averageContractValuesWidget - integer**: Average Contract Values
- **customerAgeWidget - integer**: Average Customer Age
- **customerSourcesWidget - integer**: Subscription Sources
- **extraCardsWidget - integer**: Frozen with Account
- **monthlyBillingWidget - integer**: Recurring Billing
- **debitBalanceWidget - integer**: Debit Balance
- **revenueByServiceTypeWidget - integer**: Revenue by Service
- **revenueByMonthWidget - integer**: Revenue by Month
- **recurringAnnualRevenueWidget - integer**: Recurring Annual Revenue
- **accessControlProfileName - string**: Access control profile name (if this is a preset access control profile)
- **viewAssignmentLayers - integer**: View Assignment Layers
- **editAnyBoundaryRegion - integer**: Edit Any Boundary Region
- **editBoundaryRegionInManagedArea - integer**: Edit Boundaries In Managed Area
- **editAnyAssignmentRegion - integer**: Edit Any Assignment Region
- **editAssignmentRegionInManagedArea - integer**: Edit Regions In Managed Area
- **viewReportingLayers - integer**: View Reporting Layers
- **editOwnReportingRegions - integer**: Edit Own Reporting Regions
- **editOtherReportingRegions - integer**: Edit Other Reporting Regions
- **viewDataLayers - integer**: View Data Layers
- **editOwnDataLayers - integer**: Edit Own Data Layers
- **editOtherDataLayers - integer**: Edit Other Data Layers
- **viewDoorKnockSystemLayer - integer**: View Door Knock System Layer
- **viewCustomerSystemLayer - integer**: View Customer System Layer
- **viewFeedback - integer**: View Feedback
- **dateUpdated - string**: Access Control Matrix dateUpdated

---

## /accessControl/search

<a name="documentation_accessControlSearch"></a>

**Description:** Provide a set of parameters which will return a list of ids. There is no limit to the number of IDs this will return. You can then supply these ids to the `get` endpoint in order to retrieve bulk data. Every parameter available supports a simple value OR a powerful query object that gives you access to all basic comparators. 

Example: dateAdded={"operator":">","value":"2016-01-01"}

Example: dateAdded={"operator\":\"BETWEEN\",\"value\":[\"2016-05-12\",\"2016-05-13\"]}

Available operators: >, <, >=, <=, =, !=, IN, BETWEEN, LIKE, STARTSWITH, ENDSWITH, CONTAINS.

Each of the search endpoints allows for an optional parameter 'includeData'. When sent, the API will additionally send the resolved objects for the first 1000 IDs. Keep in mind when using 'includeData' that if there are more than 1000 items an additional property '{entity}IDsNoDataExported' will specify the items that are not included in the resolved data array.

### Parameters

- **employeeID - integer**: Primary key
- **employeeIDs - integer**: Primary key
- **accessControlProfileID - integer**: 0: Custom Access Control Profile per user. Otherwise, ID of defined Access Control Profiles
- **admin - integer**: Administrator
- **accessControlProfileIDs - integer**: 0: Custom Access Control Profile per user. Otherwise, ID of defined Access Control Profiles
- **officeID - integer**: officeID of the profile
- **officeIDs - integer**: officeID of the profile
- **includeData - integer**: {0,1} Sends the resolved objects for the first 1000 IDs. If there are more than 1000 items an additional property accessControlIDsNoDataExported will specify the items that are not included in the resolved accessControl array.

### Response

- **accessControlIDs - array**

---

## /additionalContact/[id]

<a name="documentation_additionalContactGetID"></a>

**Description:** Get additionalContact data for single ID -- please provide a specific record ID in the URL structure.

### Parameters

- **-**

### Response

- **additionalContactID - integer**: Primary Key
- **additionalContactTypeID - integer**: See Admin > Preferences > Customer Preferences > Additional Contact Types
- **customerID - integer**: Customer ID that the is additional contact belongs to
- **fname - string**: Contact first name
- **lname - string**: Contact last name
- **address - string**
- **city - string**
- **state - string**
- **zip - string**
- **phone - string**
- **phoneExt - string**: Phone1 extension
- **phone2 - string**
- **phone2Ext - string**: phone2 extension
- **email - string**
- **smsReminders - integer**: Set as 1 if the additionalContact opts in for sms reminders
- **phoneReminders - integer**: Set as 1 if the additionalContact opts in for phone reminders
- **emailReminders - integer**: Set as 1 if the additionalContact opts in for email reminders
- **contactType - string**: e.g. (BILLING, BUSINESS, SERVICE, SERVICE_BILLING, TERMITE)
- **dateUpdated - string**
- **dateCreated - string**
- **addedBy - integer**
- **editedBy - integer**
- **companyName - string**
- **visibility - integer**
- **businessContactID - integer**
- **termiteReportID - integer**: If this is tied to a WDO termite report this will be non-null
- **wdoOrderedBy - integer**: If this is a WDO contact order the report this will be set as 1
- **wdoPartyOfInterest - integer**: If the WDO contact is a party of interest this will be set as 1
- **wdoReportSentTo - integer**
- **wdoEmailOnly - integer**
- **description - integer**: contact type description

---

## /additionalContact/create

<a name="documentation_additionalContactCreate"></a>

**Description:** create a customer

### Parameters

- **customerID - integer - required**
- **additionalContactTypeID - integer - required**
- **fname - string**: First name
- **lname - string**: Last name
- **address - string**: Address string
- **city - string**: City string
- **state - string**: 2 letter state code
- **zip - string**: Zip code
- **phone - string**
- **phone2 - string**
- **phoneExt - string**
- **phone2Ext - string**
- **smsReminders - integer**
- **phoneReminders - integer**
- **emailReminders - integer**
- **companyName - string**
- **email - string**: email
- **contactType - string**: contact type: SERVICE, BILLING, SERVICE_BILLING
- **businessContactID - string**: business contact ID
- **addedBy - string**: User that added this contact

---

## /additionalContact/get

<a name="documentation_additionalContactGetBulk"></a>

**Description:** Get Bulk data for additionalContact. Accepts an array of additionalContactIDs. Returns a max of 1000 records.

### Parameters

- **additionalContactIDs - array**

### Response

- **additionalContactID - integer**: Primary Key
- **additionalContactTypeID - integer**: See Admin > Preferences > Customer Preferences > Additional Contact Types
- **customerID - integer**: Customer ID that the is additional contact belongs to
- **fname - string**: Contact first name
- **lname - string**: Contact last name
- **address - string**
- **city - string**
- **state - string**
- **zip - string**
- **phone - string**
- **phoneExt - string**: Phone1 extension
- **phone2 - string**
- **phone2Ext - string**: phone2 extension
- **email - string**
- **smsReminders - integer**: Set as 1 if the additionalContact opts in for sms reminders
- **phoneReminders - integer**: Set as 1 if the additionalContact opts in for phone reminders
- **emailReminders - integer**: Set as 1 if the additionalContact opts in for email reminders
- **contactType - string**: e.g. (BILLING, BUSINESS, SERVICE, SERVICE_BILLING, TERMITE)
- **dateUpdated - string**
- **dateCreated - string**
- **addedBy - integer**
- **editedBy - integer**
- **companyName - string**
- **visibility - integer**
- **businessContactID - integer**
- **termiteReportID - integer**: If this is tied to a WDO termite report this will be non-null
- **wdoOrderedBy - integer**: If this is a WDO contact order the report this will be set as 1
- **wdoPartyOfInterest - integer**: If the WDO contact is a party of interest this will be set as 1
- **wdoReportSentTo - integer**
- **wdoEmailOnly - integer**
- **description - integer**: contact type description

---

## /additionalContact/search

<a name="documentation_additionalContactSearch"></a>

**Description:** Provide a set of parameters which will return a list of ids. There is no limit to the number of IDs this will return. You can then supply these ids to the `get` endpoint in order to retrieve bulk data. Every parameter available supports a simple value OR a powerful query object that gives you access to all basic comparators. 

Example: dateAdded={"operator":">","value":"2016-01-01"}

Example: dateAdded={"operator\":\"BETWEEN\",\"value\":[\"2016-05-12\",\"2016-05-13\"]}

Available operators: >, <, >=, <=, =, !=, IN, BETWEEN, LIKE, STARTSWITH, ENDSWITH, CONTAINS.

Each of the search endpoints allows for an optional parameter 'includeData'. When sent, the API will additionally send the resolved objects for the first 1000 IDs. Keep in mind when using 'includeData' that if there are more than 1000 items an additional property '{entity}IDsNoDataExported' will specify the items that are not included in the resolved data array.

### Parameters

- **additionalContactIDs - integer**: Primary Key
- **additionalContactID - integer**: Primary Key
- **officeIDs - integer**: Primary Key
- **officeID - integer**: Primary Key
- **customerID - integer**: Customer ID that the is additional contact belongs to
- **termiteReportID - integer**: If this is tied to a WDO termite report this will be non-null
- **includeData - integer**: {0,1} Sends the resolved objects for the first 1000 IDs. If there are more than 1000 items an additional property additionalContactIDsNoDataExported will specify the items that are not included in the resolved additionalContact array.

### Response

- **additionalContactIDs - array**

---

## /applicationMethod/[id]

<a name="documentation_applicationMethodGetID"></a>

**Description:** Get applicationMethod data for single ID -- please provide a specific record ID in the URL structure.

### Parameters

- **-**

### Response

- **applicationMethodID - integer**
- **officeID - integer**
- **applicationMethod - string**
- **visible - integer**
- **systemReserved - integer**

---

## /applicationMethod/get

<a name="documentation_applicationMethodGetBulk"></a>

**Description:** Get Bulk data for applicationMethod. Accepts an array of applciationMethodIDs. Returns a max of 1000 records.

### Parameters

- **applciationMethodIDs - array**

### Response

- **applicationMethodID - integer**
- **officeID - integer**
- **applicationMethod - string**
- **visible - integer**
- **systemReserved - integer**

---

## /applicationMethod/search

<a name="documentation_applicationMethodSearch"></a>

**Description:** Provide a set of parameters which will return a list of ids. There is no limit to the number of IDs this will return. You can then supply these ids to the `get` endpoint in order to retrieve bulk data. Every parameter available supports a simple value OR a powerful query object that gives you access to all basic comparators. 

Example: dateAdded={"operator":">","value":"2016-01-01"}

Example: dateAdded={"operator\":\"BETWEEN\",\"value\":[\"2016-05-12\",\"2016-05-13\"]}

Available operators: >, <, >=, <=, =, !=, IN, BETWEEN, LIKE, STARTSWITH, ENDSWITH, CONTAINS.

Each of the search endpoints allows for an optional parameter 'includeData'. When sent, the API will additionally send the resolved objects for the first 1000 IDs. Keep in mind when using 'includeData' that if there are more than 1000 items an additional property '{entity}IDsNoDataExported' will specify the items that are not included in the resolved data array.

### Parameters

- **methodIDs - integer**: Primary key
- **methodID - integer**: Primary key alias
- **applicationMethodID - integer**: Primary key alias
- **applicationMethodIDs - integer**: Primary key alias
- **officeIDs - integer**: OfficeID insect belongs to
- **visible - integer**: visibility of the method
- **includeData - integer**: {0,1} Sends the resolved objects for the first 1000 IDs. If there are more than 1000 items an additional property applicationMethodIDsNoDataExported will specify the items that are not included in the resolved applicationMethod array.

### Response

- **applicationMethodIDs - array**

---

## /appliedPayment/[id]

<a name="documentation_appliedPaymentGetID"></a>

**Description:** Get appliedPayment data for single ID -- please provide a specific record ID in the URL structure.

### Parameters

- **-**

### Response

- **appliedPaymentID - integer**: Applied Payment Unique Identifier
- **officeID - integer**: Office Unique Identifier
- **paymentID - integer**: Payment Unique Identifier
- **ticketID - integer**: Ticket Unique Identifier
- **customerID - integer**: Customer Unique Identifier
- **dateApplied - string**: Payment date
- **appliedBy - integer**: Employee Unique Identifier
- **appliedAmount - number**: Amount of the payment that was used
- **taxCollected - number**: Amount of tax that was collected
- **dateUpdated - string**: Date of last update. Should be the same as dateApplied as these tuples are immutable.

---

## /appliedPayment/get

<a name="documentation_appliedPaymentGetBulk"></a>

**Description:** Get Bulk data for appliedPayment. Accepts an array of appliedPaymentIDs. Returns a max of 1000 records.

### Parameters

- **appliedPaymentIDs - array**

### Response

- **appliedPaymentID - integer**: Applied Payment Unique Identifier
- **officeID - integer**: Office Unique Identifier
- **paymentID - integer**: Payment Unique Identifier
- **ticketID - integer**: Ticket Unique Identifier
- **customerID - integer**: Customer Unique Identifier
- **dateApplied - string**: Payment date
- **appliedBy - integer**: Employee Unique Identifier
- **appliedAmount - number**: Amount of the payment that was used
- **taxCollected - number**: Amount of tax that was collected
- **dateUpdated - string**: Date of last update. Should be the same as dateApplied as these tuples are immutable.

---

## /appliedPayment/search

<a name="documentation_appliedPaymentSearch"></a>

**Description:** Provide a set of parameters which will return a list of ids. There is no limit to the number of IDs this will return. You can then supply these ids to the `get` endpoint in order to retrieve bulk data. Every parameter available supports a simple value OR a powerful query object that gives you access to all basic comparators. 

Example: dateAdded={"operator":">","value":"2016-01-01"}

Example: dateAdded={"operator\":\"BETWEEN\",\"value\":[\"2016-05-12\",\"2016-05-13\"]}

Available operators: >, <, >=, <=, =, !=, IN, BETWEEN, LIKE, STARTSWITH, ENDSWITH, CONTAINS.

Each of the search endpoints allows for an optional parameter 'includeData'. When sent, the API will additionally send the resolved objects for the first 1000 IDs. Keep in mind when using 'includeData' that if there are more than 1000 items an additional property '{entity}IDsNoDataExported' will specify the items that are not included in the resolved data array.

### Parameters

- **appliedPaymentID - integer**: Primary key
- **appliedPaymentIDs - integer**: Primary key alias
- **officeIDs - integer**: Office Unique Identifier
- **officeID - integer**: Office Unique Identifier
- **paymentIDs - integer**: Payment Unique Identifier
- **paymentID - integer**: Payment Unique Identifier
- **ticketIDs - integer**: ticket Unique Identifier
- **ticketID - integer**: ticket Unique Identifier
- **customerIDs - integer**: Customer Unique Identifier
- **customerID - integer**: Customer Unique Identifier
- **dateApplied - string**: Payment application date
- **dateUpdated - string**: Date payment application was last updated.
- **includeData - integer**: {0,1} Sends the resolved objects for the first 1000 IDs. If there are more than 1000 items an additional property appliedPaymentIDsNoDataExported will specify the items that are not included in the resolved appliedPayment array.

### Response

- **appliedPaymentIDs - array**

---

## /appointment/[id]

<a name="documentation_appointmentGetID"></a>

**Description:** Get appointment data for single ID -- please provide a specific record ID in the URL structure.

### Parameters

- **includeCancellationReason - integer**: Send as 1 to retrieve an additional field cancellationReason.
- **includeTargetPests - integer**: Send as 1 to retrieve an additional field targetPests as an array of integers.
- **includeCustomFields - integer**: Send as 1 to retrieve an additional field customFields as an array of Custom Fields names and values.

### Response

- **appointmentID - integer**: Unique Identifier
- **officeID - integer**: The ID of the office this appointment belongs to.
- **customerID - integer**: The ID of the customer this appointment belongs to.
- **subscriptionID - integer**: The ID of the subscription if this appointment belongs to a subscription. If an appointment is attached to a subscription it inherits its pricing as well as other defaults. It also resets the next due date upon completion. Stand alone services or reservices will be a -1.
- **subscriptionRegionID - integer**: RegionID of the subscription if this appointment belongs to a one. For stand alone services or reservices it will be -1.
- **routeID - integer**: The ID of the route that this appointment is assigned to.
- **spotID - integer**: The ID of the spot that this appointment is assigned to. Null indicates an appointment that is flexible on route.
- **date - string**: The date this appointment is scheduled for.
- **start - string**: The beginning of the acceptable time window that the tech may arrive.
- **end - string**: The end of the acceptable time window that the tech may arrive.
- **timeWindow - string**: The classification of the time window for the appointment
- **duration - integer**: The number of minutes this appointment is scheduled for.
- **type - integer**: The service type ID of this appointment. Reference the endpoint `servicetype` for available options.
- **dateAdded - string**: The date this appointment was created / added.
- **employeeID - integer**: The employee ID who created this appointment.
- **status - integer**: The status code of this appointment.
- **statusText - string**: Friendly representation of status
- **callAhead - integer**: The number of minutes the tech should call ahead to the customer before arriving.
- **isInitial - integer**: Whether or not this is the initial appointment for the associated subscription. 1: yes, 0: no
- **subscriptionPreferredTech - integer**: The employee ID of the technitian set up as preferred for this service subscription, if this appointment belongs to a one. For stand alone services or reservices it will be -1.
- **completedBy - integer**: The employee ID who marked this as serviced -- not necessarily which tech completed the service.
- **servicedBy - integer**: The employee ID of the technician who serviced this appointment
- **dateCompleted - string**: The date this appointment was marked as serviced (when the action took place and not necessarily the date of the appointment).
- **signedByCustomer - string**: Returns 1 if the customer gave a signature when the appointment was completed, 0 otherwise.
- **signedByTech - string**: Returns 1 if the tech gave a signature when the appointment was completed, 0 otherwise.
- **notes - string**: The notes the technician left for the customer.
- **officeNotes - string**: The notes the technician left ONLY for the office.
- **timeIn - string**: The time the technician checked into the appointment (via user defined input).
- **timeOut - string**: The time the technician checked out of the appointment (via user-defined input).
- **checkIn - string**: The time the technician checked into the appointment (via check-in button).
- **checkOut - string**: The time the technician checked out of the appointment (via check-out button).
- **windSpeed - integer**: Miles Per Hour
- **windDirection - string**: The direction of the wind -- 8 point compass.
- **temperature - integer**: Degrees Farenheight.
- **amountCollected - number**: The amount the tech reported as being collected.
- **paymentMethod - integer**: The method of payment collected. -1: no payment collected, 0: coupon, 1: cash, 2: check, 3: credit card
- **servicedInterior - integer**: 1: Serviced Interior, 0: Outside only
- **ticketID - integer**: The ticket / invoice ID associated with the appointment.
- **dateCancelled - string**: Cancelation date
- **additionalTechs - string**: EmployeeIDs of additional techs on the appointment. Comma separated.
- **appointmentCancellationReason - string**: Appointment cancellation reason, only returned if parameter 'includeCancellationReason' is included with the request.
- **cancellationReason - string**: Appointment cancellation reason, only returned if parameter 'includeCancellationReason' is included with the request.
- **rescheduleReasonID - integer**: Appointment reschedule reason ID
- **reserviceReasonID - integer**: Appointment reservice reason ID
- **unitIDs - integer**: An array of unit IDs associated with this appointment (for multi unit customers)
- **targetPests - integer**: Requires parameter 'includeTargetPests' to be sent with the request. The ID of a target insect associated with the appointment, these IDs can be found in preferences via Admin > Preferences > Service Related > Target Issues
- **appointmentNotes - string**: Notes for the appointment.
- **doInterior - integer**: 0 - unspecified, 1 - Exterior only, 2 - Interior Needed
- **dateUpdated - string**: Date the appointment was last changed
- **cancelledBy - integer**: EmployeeID that cancelled the appointment.
- **assignedTech - integer**: EmployeeID that was assigned to the appointment.
- **latIn - number**: latIn recorded at appointment completion
- **latOut - number**: latOut recorded at appointment completion
- **longIn - number**: longIn recorded at appointment completion
- **longOut - number**: longOut recorded at appointment completion
- **sequence - integer**: When multiple appointments occupy the same spot this determines which of the appointments will be first.
- **lockedBy - integer**: EmployeeID who locked the appointment, or 0 if it is unlocked
- **originalAppointmentID - integer**: appointmentID of original appointment that was rescheduled

---

## /appointment/cancel

<a name="documentation_appointmentCancel"></a>

**Description:** Cancel specified appointmentID

### Parameters

- **appointmentID - integer - required**: appointmentID to cancel
- **cancelReason - string**: Cancel Reason
- **cancelledBy - integer**: employeeID that cancelled the appointment

---

## /appointment/complete

<a name="documentation_appointmentComplete"></a>

**Description:** Complete specified appointmentID

### Parameters

- **appointmentID - integer - required**
- **status - integer**: The status of an appointment which can include:0: Pending, 1: Completed, 2: No Show
- **completionNotes - string**
- **officeNotes - string**
- **flagNotes - string**
- **timeIn - string**
- **timeOut - string**
- **checkIn - string**
- **checkOut - string**
- **latIn - number**
- **latOut - number**
- **longIn - number**
- **longOut - number**
- **signature - string**: base64 encoded signature
- **techSignature - string**: base64 encoded signature
- **windSpeed - integer**
- **windDirection - string**: N,NW,NE,etc..
- **servicedInterior - integer**
- **temperature - integer**
- **sprayRigID - integer**
- **paymentMethod - integer**
- **amountCollected - number**
- **checkCollectedNumber - integer**
- **chemicals - array**
- **employeeID - integer**
- **completedBy - integer**

---

## /appointment/create

<a name="documentation_appointmentCreate"></a>

### Parameters

- **customerID - integer - required**: customerID associated with the appointment
- **type - integer - required**: serviceID to perform
- **start - string**: Start Time Window
- **end - string**: End Time Window
- **duration - integer**: Number of minutes this appointment should last
- **employeeID - integer**: employeeID to whom this appointment belongs
- **notes - string**: Appointment Notes
- **spotID -**: Specify to fix this appointment to a spot
- **routeID - integer**: Specify to fix this appointment on a route.
- **callAhead - integer**: Number of minutes ahead of the appointment start time to call
- **assignedTech - integer**: employeeID of the technician assigned to this appointment
- **subscriptionID - integer**: Specify the subscriptionID this appointment is associated with
- **doInterior - integer**: 0 - unspecified, 1 - Exterior only, 2 - Interior Needed
- **targetPests - string**: Comma separated list of insectIDs
- **rejectOccupiedSpots - integer**: Send as 1 to receive a failure result when the appointment would create a second appointment in the same spot as another appointment (fixed or floating appointments).
- **rejectFixedOccupiedSpots - integer**: Send as 1 to receive a failure result when the appointment would create a second appointment in the same spot as another fixed-to-spot appointment appointment.
- **reservation - string**: If the spotID sent has been reserved, send a bearer token to schedule to a reserved spot
- **bypassLockedRoute - integer**: Ignore locked route setting and schedule anyways
- **bypassSchedulePermission - integer**: Ignore api can schedule on route and schedule anyways.
- **servicedBy - integer**: employeeID who completed the appointment
- **completedBy - integer**: The employee ID who marked this as serviced -- not necessarily which tech completed the service.
- **sequence - integer**: When multiple appointments occupy the same spot this determines which of the appointments will be first.

---

## /appointment/get

<a name="documentation_appointmentGetBulk"></a>

**Description:** Get Bulk data for appointment. Accepts an array of appointmentIDs. Returns a max of 1000 records.

### Parameters

- **appointmentIDs - array**
- **includeCancellationReason - int**: Send as 1 to retrieve an additional field cancellationReason.
- **includeTargetPests - int**: Send as 1 to retrieve an additional field targetPests as an array of integers.
- **includeCustomFields - int**: Send as 1 to retrieve an additional field customFields as an array of Custom Fields names and values.

### Response

- **appointmentID - integer**: Unique Identifier
- **officeID - integer**: The ID of the office this appointment belongs to.
- **customerID - integer**: The ID of the customer this appointment belongs to.
- **subscriptionID - integer**: The ID of the subscription if this appointment belongs to a subscription. If an appointment is attached to a subscription it inherits its pricing as well as other defaults. It also resets the next due date upon completion. Stand alone services or reservices will be a -1.
- **subscriptionRegionID - integer**: RegionID of the subscription if this appointment belongs to a one. For stand alone services or reservices it will be -1.
- **routeID - integer**: The ID of the route that this appointment is assigned to.
- **spotID - integer**: The ID of the spot that this appointment is assigned to. Null indicates an appointment that is flexible on route.
- **date - string**: The date this appointment is scheduled for.
- **start - string**: The beginning of the acceptable time window that the tech may arrive.
- **end - string**: The end of the acceptable time window that the tech may arrive.
- **timeWindow - string**: The classification of the time window for the appointment
- **duration - integer**: The number of minutes this appointment is scheduled for.
- **type - integer**: The service type ID of this appointment. Reference the endpoint `servicetype` for available options.
- **dateAdded - string**: The date this appointment was created / added.
- **employeeID - integer**: The employee ID who created this appointment.
- **status - integer**: The status code of this appointment.
- **statusText - string**: Friendly representation of status
- **callAhead - integer**: The number of minutes the tech should call ahead to the customer before arriving.
- **isInitial - integer**: Whether or not this is the initial appointment for the associated subscription. 1: yes, 0: no
- **subscriptionPreferredTech - integer**: The employee ID of the technitian set up as preferred for this service subscription, if this appointment belongs to a one. For stand alone services or reservices it will be -1.
- **completedBy - integer**: The employee ID who marked this as serviced -- not necessarily which tech completed the service.
- **servicedBy - integer**: The employee ID of the technician who serviced this appointment
- **dateCompleted - string**: The date this appointment was marked as serviced (when the action took place and not necessarily the date of the appointment).
- **signedByCustomer - string**: Returns 1 if the customer gave a signature when the appointment was completed, 0 otherwise.
- **signedByTech - string**: Returns 1 if the tech gave a signature when the appointment was completed, 0 otherwise.
- **notes - string**: The notes the technician left for the customer.
- **officeNotes - string**: The notes the technician left ONLY for the office.
- **timeIn - string**: The time the technician checked into the appointment (via user defined input).
- **timeOut - string**: The time the technician checked out of the appointment (via user-defined input).
- **checkIn - string**: The time the technician checked into the appointment (via check-in button).
- **checkOut - string**: The time the technician checked out of the appointment (via check-out button).
- **windSpeed - integer**: Miles Per Hour
- **windDirection - string**: The direction of the wind -- 8 point compass.
- **temperature - integer**: Degrees Farenheight.
- **amountCollected - number**: The amount the tech reported as being collected.
- **paymentMethod - integer**: The method of payment collected. -1: no payment collected, 0: coupon, 1: cash, 2: check, 3: credit card
- **servicedInterior - integer**: 1: Serviced Interior, 0: Outside only
- **ticketID - integer**: The ticket / invoice ID associated with the appointment.
- **dateCancelled - string**: Cancelation date
- **additionalTechs - string**: EmployeeIDs of additional techs on the appointment. Comma separated.
- **appointmentCancellationReason - string**: Appointment cancellation reason, only returned if parameter 'includeCancellationReason' is included with the request.
- **cancellationReason - string**: Appointment cancellation reason, only returned if parameter 'includeCancellationReason' is included with the request.
- **rescheduleReasonID - integer**: Appointment reschedule reason ID
- **reserviceReasonID - integer**: Appointment reservice reason ID
- **unitIDs - integer**: An array of unit IDs associated with this appointment (for multi unit customers)
- **targetPests - integer**: Requires parameter 'includeTargetPests' to be sent with the request. The ID of a target insect associated with the appointment, these IDs can be found in preferences via Admin > Preferences > Service Related > Target Issues
- **appointmentNotes - string**: Notes for the appointment.
- **doInterior - integer**: 0 - unspecified, 1 - Exterior only, 2 - Interior Needed
- **dateUpdated - string**: Date the appointment was last changed
- **cancelledBy - integer**: EmployeeID that cancelled the appointment.
- **assignedTech - integer**: EmployeeID that was assigned to the appointment.
- **latIn - number**: latIn recorded at appointment completion
- **latOut - number**: latOut recorded at appointment completion
- **longIn - number**: longIn recorded at appointment completion
- **longOut - number**: longOut recorded at appointment completion
- **sequence - integer**: When multiple appointments occupy the same spot this determines which of the appointments will be first.
- **lockedBy - integer**: EmployeeID who locked the appointment, or 0 if it is unlocked
- **originalAppointmentID - integer**: appointmentID of original appointment that was rescheduled

---

## /appointment/search

<a name="documentation_appointmentSearch"></a>

**Description:** Provide a set of parameters which will return a list of ids. There is no limit to the number of IDs this will return. You can then supply these ids to the `get` endpoint in order to retrieve bulk data. Every parameter available supports a simple value OR a powerful query object that gives you access to all basic comparators. 

Example: dateAdded={"operator":">","value":"2016-01-01"}

Example: dateAdded={"operator\":\"BETWEEN\",\"value\":[\"2016-05-12\",\"2016-05-13\"]}

Available operators: >, <, >=, <=, =, !=, IN, BETWEEN, LIKE, STARTSWITH, ENDSWITH, CONTAINS.

Each of the search endpoints allows for an optional parameter 'includeData'. When sent, the API will additionally send the resolved objects for the first 1000 IDs. Keep in mind when using 'includeData' that if there are more than 1000 items an additional property '{entity}IDsNoDataExported' will specify the items that are not included in the resolved data array.

### Parameters

- **officeID - integer**
- **officeIDs - integer**
- **appointmentIDs - integer**: Unique ID
- **status - integer**: The status of an appointment which can include:<ul><li>0: Pending</li><li>1: Completed</li><li>2: No Show</li><li>-2: Rescheduled</li><li>-1: Cancelled</li></ul>
- **customerIDs - integer**: Customer who owns this appointment
- **subscriptionIDs - integer**: Subscription who owns this appointment. Appointments that are attached to subscriptions inherit the subscriptions pricing templates and other defaults as well as update the subscriptions next service dates upon completion. Re-services and stand-alone services are NOT attached to subscriptions.
- **spotIDs - integer**: Spot ID the appointment is assigned to.
- **routeIDs - integer**: Route the appointment is assigned to.
- **dateAdded - string**: Date this appointment was created / scheduled.
- **dateCompleted - string**: Date this appointment was completed / marked serviced (not necessarily the date it was on the schedule).
- **date - string**: Date this appointment is scheduled for.
- **serviceIDs - integer**: Service type ID for this appointment. Reference the endpoint `servicetypes` to see available options
- **servicedBy - integer**: The technician who serviced this appointment
- **completedBy - integer**: The user who marked this appointment as completed NOT necessarily the one who serviced the appointment.
- **dateAddedStart - string**
- **dateAddedEnd - string**
- **dateStart - string**
- **dateEnd - string**
- **dateCancelled - string**: Cancelation date
- **additionalTechs - integer**: employeeID of additional tech
- **salesAnchor - integer**: Set as 1 if this is the first appointment connected to a subscription
- **targetPests - integer**: The ID of a target insect associated with the appointment, these IDs can be found in preferences via Admin > Preferences > Service Related > Target Issues
- **dateUpdated - string**: Date the appointment was last changed
- **salesTeamID - integer**: Sales team that sold the appointment.
- **cancelledBy - integer**: EmployeeID that cancelled the appointment.
- **assignedTech - integer**: EmployeeID that was assigned to the appointment.
- **includeData - integer**: {0,1} Sends the resolved objects for the first 1000 IDs. If there are more than 1000 items an additional property appointmentIDsNoDataExported will specify the items that are not included in the resolved appointment array.

### Response

- **appointmentIDs - array**

---

## /appointment/update

<a name="documentation_appointmentUpdate"></a>

### Parameters

- **customerID - integer**: customerID associated with the appointment
- **type - integer**: serviceID to perform
- **start - string**: Start Time Window
- **end - string**: End Time Window
- **duration - integer**: Number of minutes this appointment should last
- **employeeID - integer**: employeeID to whom this appointment belongs
- **notes - string**: Appointment Notes
- **spotID -**: Specify to fix this appointment to a spot
- **routeID - integer**: Specify to fix this appointment on a route.
- **callAhead - integer**: Number of minutes ahead of the appointment start time to call
- **assignedTech - integer**: employeeID of the technician assigned to this appointment
- **subscriptionID - integer**: Specify the subscriptionID this appointment is associated with
- **doInterior - integer**: 0 - unspecified, 1 - Exterior only, 2 - Interior Needed
- **targetPests - string**: Comma separated list of insectIDs
- **rejectOccupiedSpots - integer**: Send as 1 to receive a failure result when the appointment would create a second appointment in the same spot as another appointment (fixed or floating appointments).
- **rejectFixedOccupiedSpots - integer**: Send as 1 to receive a failure result when the appointment would create a second appointment in the same spot as another fixed-to-spot appointment appointment.
- **reservation - string**: If the spotID sent has been reserved, send a bearer token to schedule to a reserved spot
- **bypassLockedRoute - integer**: Ignore locked route setting and schedule anyways
- **bypassSchedulePermission - integer**: Ignore api can schedule on route and schedule anyways.
- **servicedBy - integer**: employeeID who completed the appointment
- **completedBy - integer**: The employee ID who marked this as serviced -- not necessarily which tech completed the service.
- **sequence - integer**: When multiple appointments occupy the same spot this determines which of the appointments will be first.
- **appointmentID - integer - required**: Primary key to the appointments table.
- **timeIn - string**: The time the technician checked into the appointment (via user defined input).
- **timeOut - string**: The time the technician checked out of the appointment (via user-defined input).
- **checkIn - string**: The time the technician checked into the appointment (via check-in button).
- **checkOut - string**: The time the technician checked out of the appointment (via check-out button).
- **status - integer**: The status of an appointment which can include:0: Pending, 1: Completed, 2: No Show
- **cancelledBy - integer**: employeeID of employee that cancelled the appointment, if setting to status No Show

---

## /appointmentCancellationReason/[id]

<a name="documentation_appointmentCancellationReasonGetID"></a>

**Description:** Get appointmentCancellationReason data for single ID -- please provide a specific record ID in the URL structure.

### Parameters

- **-**

### Response

- **cancellationReasonID - integer**
- **officeID - integer**
- **visible - integer**: Used by the FieldRoutes application to hide/show reasons from staff
- **systemReserved - integer**: Used by the FieldRoutes application to specify fixed system actions (this field no longer exists and will always be 0)
- **reason - string**: Description of the appointment cancellation reason

---

## /appointmentCancellationReason/get

<a name="documentation_appointmentCancellationReasonGetBulk"></a>

**Description:** Get Bulk data for appointmentCancellationReason. Accepts an array of cancellationReasonIDs. Returns a max of 1000 records.

### Parameters

- **cancellationReasonIDs - array**

### Response

- **cancellationReasonID - integer**
- **officeID - integer**
- **visible - integer**: Used by the FieldRoutes application to hide/show reasons from staff
- **systemReserved - integer**: Used by the FieldRoutes application to specify fixed system actions (this field no longer exists and will always be 0)
- **reason - string**: Description of the appointment cancellation reason

---

## /appointmentCancellationReason/search

<a name="documentation_appointmentCancellationReasonSearch"></a>

**Description:** Provide a set of parameters which will return a list of ids. There is no limit to the number of IDs this will return. You can then supply these ids to the `get` endpoint in order to retrieve bulk data. Every parameter available supports a simple value OR a powerful query object that gives you access to all basic comparators. 

Example: dateAdded={"operator":">","value":"2016-01-01"}

Example: dateAdded={"operator\":\"BETWEEN\",\"value\":[\"2016-05-12\",\"2016-05-13\"]}

Available operators: >, <, >=, <=, =, !=, IN, BETWEEN, LIKE, STARTSWITH, ENDSWITH, CONTAINS.

Each of the search endpoints allows for an optional parameter 'includeData'. When sent, the API will additionally send the resolved objects for the first 1000 IDs. Keep in mind when using 'includeData' that if there are more than 1000 items an additional property '{entity}IDsNoDataExported' will specify the items that are not included in the resolved data array.

### Parameters

- **cancellationReasonIDs - integer**
- **cancellationReasonID - integer**
- **officeIDs - integer**
- **officeID - integer**
- **visible - integer**
- **includeData - integer**: {0,1} Sends the resolved objects for the first 1000 IDs. If there are more than 1000 items an additional property appointmentCancellationReasonIDsNoDataExported will specify the items that are not included in the resolved appointmentCancellationReason array.

### Response

- **appointmentCancellationReasonIDs - array**

---

## /appointmentReminder/[id]

<a name="documentation_appointmentReminderGetID"></a>

**Description:** Get appointmentReminder data for single ID -- please provide a specific record ID in the URL structure.

### Parameters

- **-**

### Response

- **reminderID - integer**: Primary Key
- **officeID - integer**: Office the reminder belongs to
- **appointmentID - integer**: appointmentID the reminder pertains to
- **text - string**: Text of the reminder
- **dateSent - string**: Time the reminder was sent
- **emailSent - string**: Time email was sent
- **voiceSent - string**: Time voice message was sent
- **status - integer**: -1 = don't send reminder, 0 = not sent, 1 = sent, 9 = confirmed
- **response - string**: Response text received
- **responseTime - string**: Time response was received
- **sendTo - string**: Phone number for SMS
- **emailAddress - string**: Email address the reminder was sent to
- **voiceNumber - string**: Phone number for voice
- **dateUpdated - string**: Date that this appointmentReminder was last updated

---

## /appointmentReminder/create

<a name="documentation_appointmentReminderCreate"></a>

**Description:** create a customer

### Parameters

- **appointmentID - integer - required**: appointmentID the reminder pertains to
- **text - string - required**: Text of the reminder
- **dateSent - string - required**: Time the reminder was sent
- **emailSent - string - required**: Time email was sent
- **voiceSent - string**: Time voice message was sent
- **status - integer - required**: -1 = don't send reminder, 0 = not sent(not allowed), 1 = sent, 6 = confirmed by office, 9 = confirmed via SMS
- **response - string**: Response text received
- **responseTime - string**: Time response was received
- **sendTo - string**: Phone number for SMS
- **emailAddress - string**: Email address the reminder was sent to
- **voiceNumber - string**: Phone number for voice

---

## /appointmentReminder/get

<a name="documentation_appointmentReminderGetBulk"></a>

**Description:** Get Bulk data for appointmentReminder. Accepts an array of reminderIDs. Returns a max of 1000 records.

### Parameters

- **reminderIDs - array**

### Response

- **reminderID - integer**: Primary Key
- **officeID - integer**: Office the reminder belongs to
- **appointmentID - integer**: appointmentID the reminder pertains to
- **text - string**: Text of the reminder
- **dateSent - string**: Time the reminder was sent
- **emailSent - string**: Time email was sent
- **voiceSent - string**: Time voice message was sent
- **status - integer**: -1 = don't send reminder, 0 = not sent, 1 = sent, 9 = confirmed
- **response - string**: Response text received
- **responseTime - string**: Time response was received
- **sendTo - string**: Phone number for SMS
- **emailAddress - string**: Email address the reminder was sent to
- **voiceNumber - string**: Phone number for voice
- **dateUpdated - string**: Date that this appointmentReminder was last updated

---

## /appointmentReminder/search

<a name="documentation_appointmentReminderSearch"></a>

**Description:** Provide a set of parameters which will return a list of ids. There is no limit to the number of IDs this will return. You can then supply these ids to the `get` endpoint in order to retrieve bulk data. Every parameter available supports a simple value OR a powerful query object that gives you access to all basic comparators. 

Example: dateAdded={"operator":">","value":"2016-01-01"}

Example: dateAdded={"operator\":\"BETWEEN\",\"value\":[\"2016-05-12\",\"2016-05-13\"]}

Available operators: >, <, >=, <=, =, !=, IN, BETWEEN, LIKE, STARTSWITH, ENDSWITH, CONTAINS.

Each of the search endpoints allows for an optional parameter 'includeData'. When sent, the API will additionally send the resolved objects for the first 1000 IDs. Keep in mind when using 'includeData' that if there are more than 1000 items an additional property '{entity}IDsNoDataExported' will specify the items that are not included in the resolved data array.

### Parameters

- **reminderID - integer**: Primary Key
- **reminderIDs - integer**: Alias of reminderID
- **appointmentReminderIDs - integer**: Alias of reminderID
- **officeIDs - integer**: Office the reminder belongs to
- **appointmentID - integer**: appointmentID the reminder pertains to
- **text - string**: Text of the reminder
- **dateSent - string**: Time the reminder was sent
- **emailSent - string**: Time email was sent
- **voiceSent - string**: Time voice message was sent
- **status - integer**: -1 = don't send, 0 = not sent, 1 = sent, 9 = confirmed
- **response - string**: Response text received
- **responseTime - string**: Time response was received
- **sendTo - string**: Phone number for SMS
- **emailAddress - string**: Email address the reminder was sent to
- **voiceNumber - string**: Phone number for voice
- **dateUpdated - string**: Date that this appointmentReminder was last updated
- **includeData - integer**: {0,1} Sends the resolved objects for the first 1000 IDs. If there are more than 1000 items an additional property appointmentReminderIDsNoDataExported will specify the items that are not included in the resolved appointmentReminder array.

### Response

- **appointmentReminderIDs - array**

---

## /appointmentReminder/update

<a name="documentation_appointmentReminderUpdate"></a>

**Description:** Update appointmentReminder details

### Parameters

- **appointmentID - integer**: appointmentID the reminder pertains to
- **text - string**: Text of the reminder
- **dateSent - string**: Time the reminder was sent
- **emailSent - string**: Time email was sent
- **voiceSent - string**: Time voice message was sent
- **status - integer**: -1 = don't send reminder, 0 = not sent(not allowed), 1 = sent, 6 = confirmed by office, 9 = confirmed via SMS
- **response - string**: Response text received
- **responseTime - string**: Time response was received
- **sendTo - string**: Phone number for SMS
- **emailAddress - string**: Email address the reminder was sent to
- **voiceNumber - string**: Phone number for voice
- **reminderID - integer - required**: Primary key to the appointmentReminder table.

---

## /appointmentRescheduleReason/[id]

<a name="documentation_appointmentRescheduleReasonGetID"></a>

**Description:** Get appointmentRescheduleReason data for single ID -- please provide a specific record ID in the URL structure.

### Parameters

- **-**

### Response

- **rescheduleReasonID - integer**
- **officeID - integer**
- **visible - integer**: Used by the FieldRoutes application to hide/show reasons from staff
- **systemReserved - integer**: Used by the FieldRoutes application to specify fixed system actions (field no longer exists and will always return as 0)
- **reason - string**: Description of the appointment reschedule reason

---

## /appointmentRescheduleReason/get

<a name="documentation_appointmentRescheduleReasonGetBulk"></a>

**Description:** Get Bulk data for appointmentRescheduleReason. Accepts an array of rescheduleReasonIDs. Returns a max of 1000 records.

### Parameters

- **rescheduleReasonIDs - array**

### Response

- **rescheduleReasonID - integer**
- **officeID - integer**
- **visible - integer**: Used by the FieldRoutes application to hide/show reasons from staff
- **systemReserved - integer**: Used by the FieldRoutes application to specify fixed system actions (field no longer exists and will always return as 0)
- **reason - string**: Description of the appointment reschedule reason

---

## /appointmentRescheduleReason/search

<a name="documentation_appointmentRescheduleReasonSearch"></a>

**Description:** Provide a set of parameters which will return a list of ids. There is no limit to the number of IDs this will return. You can then supply these ids to the `get` endpoint in order to retrieve bulk data. Every parameter available supports a simple value OR a powerful query object that gives you access to all basic comparators. 

Example: dateAdded={"operator":">","value":"2016-01-01"}

Example: dateAdded={"operator\":\"BETWEEN\",\"value\":[\"2016-05-12\",\"2016-05-13\"]}

Available operators: >, <, >=, <=, =, !=, IN, BETWEEN, LIKE, STARTSWITH, ENDSWITH, CONTAINS.

Each of the search endpoints allows for an optional parameter 'includeData'. When sent, the API will additionally send the resolved objects for the first 1000 IDs. Keep in mind when using 'includeData' that if there are more than 1000 items an additional property '{entity}IDsNoDataExported' will specify the items that are not included in the resolved data array.

### Parameters

- **rescheduleReasonIDs - integer**
- **rescheduleReasonID - integer**
- **officeIDs - integer**
- **officeID - integer**
- **visible - integer**
- **includeData - integer**: {0,1} Sends the resolved objects for the first 1000 IDs. If there are more than 1000 items an additional property appointmentRescheduleReasonIDsNoDataExported will specify the items that are not included in the resolved appointmentRescheduleReason array.

### Response

- **appointmentRescheduleReasonIDs - array**

---

## /cancellationReason/[id]

<a name="documentation_cancellationReasonGetID"></a>

**Description:** Get cancellationReason data for single ID -- please provide a specific record ID in the URL structure.

### Parameters

- **-**

### Response

- **reasonID - integer**
- **officeID - integer**
- **visible - integer**: Used by the FieldRoutes application to hide/show reasons from staff
- **systemReserved - integer**: Used by the FieldRoutes application to specify fixed system actions (field no longer exists and will will always return 0)
- **reason - string**: Description of the cancellation reason

---

## /cancellationReason/get

<a name="documentation_cancellationReasonGetBulk"></a>

**Description:** Get Bulk data for cancellationReason. Accepts an array of reasonIDs. Returns a max of 1000 records.

### Parameters

- **reasonIDs - array**

### Response

- **reasonID - integer**
- **officeID - integer**
- **visible - integer**: Used by the FieldRoutes application to hide/show reasons from staff
- **systemReserved - integer**: Used by the FieldRoutes application to specify fixed system actions (field no longer exists and will will always return 0)
- **reason - string**: Description of the cancellation reason

---

## /cancellationReason/search

<a name="documentation_cancellationReasonSearch"></a>

**Description:** Provide a set of parameters which will return a list of ids. There is no limit to the number of IDs this will return. You can then supply these ids to the `get` endpoint in order to retrieve bulk data. Every parameter available supports a simple value OR a powerful query object that gives you access to all basic comparators. 

Example: dateAdded={"operator":">","value":"2016-01-01"}

Example: dateAdded={"operator\":\"BETWEEN\",\"value\":[\"2016-05-12\",\"2016-05-13\"]}

Available operators: >, <, >=, <=, =, !=, IN, BETWEEN, LIKE, STARTSWITH, ENDSWITH, CONTAINS.

Each of the search endpoints allows for an optional parameter 'includeData'. When sent, the API will additionally send the resolved objects for the first 1000 IDs. Keep in mind when using 'includeData' that if there are more than 1000 items an additional property '{entity}IDsNoDataExported' will specify the items that are not included in the resolved data array.

### Parameters

- **reasonIDs - integer**
- **reasonID - integer**
- **officeIDs - integer**
- **officeID - integer**
- **visible - integer**
- **includeData - integer**: {0,1} Sends the resolved objects for the first 1000 IDs. If there are more than 1000 items an additional property cancellationReasonIDsNoDataExported will specify the items that are not included in the resolved cancellationReason array.

### Response

- **cancellationReasonIDs - array**

---

## /changelog/[id]

<a name="documentation_changelogGetID"></a>

**Description:** Get changelog data for single ID -- please provide a specific record ID in the URL structure.

### Parameters

- **-**

### Response

- **changeID - integer**: Unique ID
- **classID - integer**: Constant number identifying change type. Possible Values: {"Employee":1,"Group":2,"Route":3,"Appointment":4,"Ticket":5,"PaymentProfile":6,"Subscription":7,"Customer":8,"Diagram":9,"InsectsAction":10,"ServiceTypesAction":11,"PreSetNotesAction":13,"SprayRigsAction":12,"AddOnsAction":15,"EquipmentTypesAction":14,"GenericFlagsAction":17,"DivisionsAction":20,"CancellationReasonsAction":18,"FrequencyAction":16,"VoiceMessagesAction":22,"Unit":21,"SalesAidesAction":26,"FormTemplatesAction":28,"RegionsAction":24,"DiagramMarkersAction":37,"LostReasonsAction":40,"BillingLetterTemplatesAction":29,"LocationAction":39,"ChemicalsAction":35,"CustomerSourcesAction":19,"NoteCategoriesAction":41,"SocialNetworkAction":38,"ContractTemplatesAction":27,"OfficeInfoAction":32,"DealsAction":30,"LeadStagesAction":25,"NoteTypesAction":36,"MerchantInfoAction":33,"VendorsAction":80,"AccessControlProfilesAction":23,"Document":42,"PreferencesAction":31,"CustomerCommunicationsAction":34,"ClockCategoriesAction":43,"ObjectionsAction":44,"CompetitorsAction":45,"CommissionRateAction":46,"CreditCardImportAction":47,"PreferencesBodyAction":50,"AdditionalContact":51,"StructureTemplatesAction":58,"ConditionTypesAction":55,"StructuresAction":60,"ConditionsAction":56,"ConditionTemplatesAction":57,"EmailTemplateAction":52,"EmailCategoryAction":53,"ExceptionTypesAction":59,"TimeClockEntriesAction":54,"Payment":61,"Task":62,"TimeClockSettingsAction":63,"VisualRouting":64,"TermiteReportAction":65,"TermiteFindingAction":66,"TermiteRecommendationAction":67,"TermiteAreaAction":68,"TermiteFindingTemplateAction":69,"TermiteRecommendationTemplateAction":70,"RenewalNoticeAction":71,"SubPropertyTypesAction":72,"ElementProfile":73,"BrainProfile":74,"NMIProfile":75,"SpreedlyProfile":76,"RoutesProfile":77,"PayrixProfile":79,"Equipment":78,"SkipReasonsAction":84,"SkillsAction":81,"ServicePlanAction":85,"ServicePlanRoundAction":86,"PropertyEstimationCategoriesAction":87,"PropertyEstimationStatsAction":88,"SalesLeaderboardProfileAction":89,"CustomFieldsAction":92,"AffiliateNetworkBillingOffice":93,"PrepayLetterTemplates":94,"CommissionRateProfilesAssignedEmployees":95}
- **class - string**: Name of the Class associated with the number. Possible values: Employee, Group, Route, Appointment, Ticket, PaymentProfile, Subscription, Customer, Diagram, InsectsAction, ServiceTypesAction, PreSetNotesAction, SprayRigsAction, AddOnsAction, EquipmentTypesAction, GenericFlagsAction, DivisionsAction, CancellationReasonsAction, FrequencyAction, VoiceMessagesAction, Unit, SalesAidesAction, FormTemplatesAction, RegionsAction, DiagramMarkersAction, LostReasonsAction, BillingLetterTemplatesAction, LocationAction, ChemicalsAction, CustomerSourcesAction, NoteCategoriesAction, SocialNetworkAction, ContractTemplatesAction, OfficeInfoAction, DealsAction, LeadStagesAction, NoteTypesAction, MerchantInfoAction, VendorsAction, AccessControlProfilesAction, Document, PreferencesAction, CustomerCommunicationsAction, ClockCategoriesAction, ObjectionsAction, CompetitorsAction, CommissionRateAction, CreditCardImportAction, PreferencesBodyAction, AdditionalContact, StructureTemplatesAction, ConditionTypesAction, StructuresAction, ConditionsAction, ConditionTemplatesAction, EmailTemplateAction, EmailCategoryAction, ExceptionTypesAction, TimeClockEntriesAction, Payment, Task, TimeClockSettingsAction, VisualRouting, TermiteReportAction, TermiteFindingAction, TermiteRecommendationAction, TermiteAreaAction, TermiteFindingTemplateAction, TermiteRecommendationTemplateAction, RenewalNoticeAction, SubPropertyTypesAction, ElementProfile, BrainProfile, NMIProfile, SpreedlyProfile, RoutesProfile, PayrixProfile, Equipment, SkipReasonsAction, SkillsAction, ServicePlanAction, ServicePlanRoundAction, PropertyEstimationCategoriesAction, PropertyEstimationStatsAction, SalesLeaderboardProfileAction, CustomFieldsAction, AffiliateNetworkBillingOffice, PrepayLetterTemplates, CommissionRateProfilesAssignedEmployees
- **dateChanged - string**: Date this change was made.
- **employeeID - integer**: ID of employee who made the change.
- **notes - json**: JSON encoded object representing the change that was made.
- **referenceID - integer**: ID of the specified class that was changed

---

## /changelog/get

<a name="documentation_changelogGetBulk"></a>

**Description:** Get Bulk data for changelog. Accepts an array of changeIDs. Returns a max of 1000 records.

### Parameters

- **changeIDs - array**

### Response

- **changeID - integer**: Unique ID
- **classID - integer**: Constant number identifying change type. Possible Values: {"Employee":1,"Group":2,"Route":3,"Appointment":4,"Ticket":5,"PaymentProfile":6,"Subscription":7,"Customer":8,"Diagram":9,"InsectsAction":10,"ServiceTypesAction":11,"PreSetNotesAction":13,"SprayRigsAction":12,"AddOnsAction":15,"EquipmentTypesAction":14,"GenericFlagsAction":17,"DivisionsAction":20,"CancellationReasonsAction":18,"FrequencyAction":16,"VoiceMessagesAction":22,"Unit":21,"SalesAidesAction":26,"FormTemplatesAction":28,"RegionsAction":24,"DiagramMarkersAction":37,"LostReasonsAction":40,"BillingLetterTemplatesAction":29,"LocationAction":39,"ChemicalsAction":35,"CustomerSourcesAction":19,"NoteCategoriesAction":41,"SocialNetworkAction":38,"ContractTemplatesAction":27,"OfficeInfoAction":32,"DealsAction":30,"LeadStagesAction":25,"NoteTypesAction":36,"MerchantInfoAction":33,"VendorsAction":80,"AccessControlProfilesAction":23,"Document":42,"PreferencesAction":31,"CustomerCommunicationsAction":34,"ClockCategoriesAction":43,"ObjectionsAction":44,"CompetitorsAction":45,"CommissionRateAction":46,"CreditCardImportAction":47,"PreferencesBodyAction":50,"AdditionalContact":51,"StructureTemplatesAction":58,"ConditionTypesAction":55,"StructuresAction":60,"ConditionsAction":56,"ConditionTemplatesAction":57,"EmailTemplateAction":52,"EmailCategoryAction":53,"ExceptionTypesAction":59,"TimeClockEntriesAction":54,"Payment":61,"Task":62,"TimeClockSettingsAction":63,"VisualRouting":64,"TermiteReportAction":65,"TermiteFindingAction":66,"TermiteRecommendationAction":67,"TermiteAreaAction":68,"TermiteFindingTemplateAction":69,"TermiteRecommendationTemplateAction":70,"RenewalNoticeAction":71,"SubPropertyTypesAction":72,"ElementProfile":73,"BrainProfile":74,"NMIProfile":75,"SpreedlyProfile":76,"RoutesProfile":77,"PayrixProfile":79,"Equipment":78,"SkipReasonsAction":84,"SkillsAction":81,"ServicePlanAction":85,"ServicePlanRoundAction":86,"PropertyEstimationCategoriesAction":87,"PropertyEstimationStatsAction":88,"SalesLeaderboardProfileAction":89,"CustomFieldsAction":92,"AffiliateNetworkBillingOffice":93,"PrepayLetterTemplates":94,"CommissionRateProfilesAssignedEmployees":95}
- **class - string**: Name of the Class associated with the number. Possible values: Employee, Group, Route, Appointment, Ticket, PaymentProfile, Subscription, Customer, Diagram, InsectsAction, ServiceTypesAction, PreSetNotesAction, SprayRigsAction, AddOnsAction, EquipmentTypesAction, GenericFlagsAction, DivisionsAction, CancellationReasonsAction, FrequencyAction, VoiceMessagesAction, Unit, SalesAidesAction, FormTemplatesAction, RegionsAction, DiagramMarkersAction, LostReasonsAction, BillingLetterTemplatesAction, LocationAction, ChemicalsAction, CustomerSourcesAction, NoteCategoriesAction, SocialNetworkAction, ContractTemplatesAction, OfficeInfoAction, DealsAction, LeadStagesAction, NoteTypesAction, MerchantInfoAction, VendorsAction, AccessControlProfilesAction, Document, PreferencesAction, CustomerCommunicationsAction, ClockCategoriesAction, ObjectionsAction, CompetitorsAction, CommissionRateAction, CreditCardImportAction, PreferencesBodyAction, AdditionalContact, StructureTemplatesAction, ConditionTypesAction, StructuresAction, ConditionsAction, ConditionTemplatesAction, EmailTemplateAction, EmailCategoryAction, ExceptionTypesAction, TimeClockEntriesAction, Payment, Task, TimeClockSettingsAction, VisualRouting, TermiteReportAction, TermiteFindingAction, TermiteRecommendationAction, TermiteAreaAction, TermiteFindingTemplateAction, TermiteRecommendationTemplateAction, RenewalNoticeAction, SubPropertyTypesAction, ElementProfile, BrainProfile, NMIProfile, SpreedlyProfile, RoutesProfile, PayrixProfile, Equipment, SkipReasonsAction, SkillsAction, ServicePlanAction, ServicePlanRoundAction, PropertyEstimationCategoriesAction, PropertyEstimationStatsAction, SalesLeaderboardProfileAction, CustomFieldsAction, AffiliateNetworkBillingOffice, PrepayLetterTemplates, CommissionRateProfilesAssignedEmployees
- **dateChanged - string**: Date this change was made.
- **employeeID - integer**: ID of employee who made the change.
- **notes - json**: JSON encoded object representing the change that was made.
- **referenceID - integer**: ID of the specified class that was changed

---

## /changelog/search

<a name="documentation_changelogSearch"></a>

**Description:** Provide a set of parameters which will return a list of ids. There is no limit to the number of IDs this will return. You can then supply these ids to the `get` endpoint in order to retrieve bulk data. Every parameter available supports a simple value OR a powerful query object that gives you access to all basic comparators. 

Example: dateAdded={"operator":">","value":"2016-01-01"}

Example: dateAdded={"operator\":\"BETWEEN\",\"value\":[\"2016-05-12\",\"2016-05-13\"]}

Available operators: >, <, >=, <=, =, !=, IN, BETWEEN, LIKE, STARTSWITH, ENDSWITH, CONTAINS.

Each of the search endpoints allows for an optional parameter 'includeData'. When sent, the API will additionally send the resolved objects for the first 1000 IDs. Keep in mind when using 'includeData' that if there are more than 1000 items an additional property '{entity}IDsNoDataExported' will specify the items that are not included in the resolved data array.

### Parameters

- **officeIDs - integer**
- **classID - integer**
- **referenceID - integer**
- **dateChanged - string**: The date this log was created
- **changeIDs - integer**: Primary key for changelog
- **changelogIDs - integer**: Primary key for changelog (alias)
- **includeData - integer**: {0,1} Sends the resolved objects for the first 1000 IDs. If there are more than 1000 items an additional property changelogIDsNoDataExported will specify the items that are not included in the resolved changelog array.

### Response

- **changelogIDs - array**

---

## /chargeback/[id]

<a name="documentation_chargebackGetID"></a>

**Description:** Get chargeback data for single ID -- please provide a specific record ID in the URL structure.

### Parameters

- **-**

### Response

- **gatewayChargebackID - integer**
- **officeID - integer**
- **dateCreated - string**
- **dateUpdated - string**
- **chargebackAmount - number**
- **chargebackReasonCode - string**
- **paymentID - integer**
- **gatewayBillingName - integer**

---

## /chargeback/get

<a name="documentation_chargebackGetBulk"></a>

**Description:** Get Bulk data for chargeback. Accepts an array of gatewayChargebackIDs. Returns a max of 1000 records.

### Parameters

- **gatewayChargebackIDs - array**

### Response

- **gatewayChargebackID - integer**
- **officeID - integer**
- **dateCreated - string**
- **dateUpdated - string**
- **chargebackAmount - number**
- **chargebackReasonCode - string**
- **paymentID - integer**
- **gatewayBillingName - integer**

---

## /chargeback/search

<a name="documentation_chargebackSearch"></a>

**Description:** Provide a set of parameters which will return a list of ids. There is no limit to the number of IDs this will return. You can then supply these ids to the `get` endpoint in order to retrieve bulk data. Every parameter available supports a simple value OR a powerful query object that gives you access to all basic comparators. 

Example: dateAdded={"operator":">","value":"2016-01-01"}

Example: dateAdded={"operator\":\"BETWEEN\",\"value\":[\"2016-05-12\",\"2016-05-13\"]}

Available operators: >, <, >=, <=, =, !=, IN, BETWEEN, LIKE, STARTSWITH, ENDSWITH, CONTAINS.

Each of the search endpoints allows for an optional parameter 'includeData'. When sent, the API will additionally send the resolved objects for the first 1000 IDs. Keep in mind when using 'includeData' that if there are more than 1000 items an additional property '{entity}IDsNoDataExported' will specify the items that are not included in the resolved data array.

### Parameters

- **gatewayChargebackIDs - integer**: Primary key
- **gatewayChargebackID - integer**: Primary key alias
- **officeIDs - integer**: Office ID chargeback belongs to
- **dateCreated - string**: Date created
- **dateUpdated - string**: Date last updated
- **includeData - integer**: {0,1} Sends the resolved objects for the first 1000 IDs. If there are more than 1000 items an additional property chargebackIDsNoDataExported will specify the items that are not included in the resolved chargeback array.

### Response

- **chargebackIDs - array**

---

## /chemical/[id]

<a name="documentation_chemicalGetID"></a>

**Description:** Get chemical data for single ID -- please provide a specific record ID in the URL structure.

### Parameters

- **-**

### Response

- **chemicalID - integer**
- **name - string**
- **manufacturer - string**
- **label - string**
- **ingredient1 - string**
- **ingredient2 - string**
- **ingredient3 - string**
- **percent1 - number**
- **percent2 - number**
- **percent3 - number**
- **epaNumber - string**
- **image - string**
- **description - string**
- **defaultDilution - number**
- **concentratedUnit - string**
- **dilutedUnit - string**
- **inventoryUnit - string**
- **applicationRate - string**
- **links - string**
- **msdsLink - string**
- **measurementType - integer**
- **visible - integer**
- **defaultApplicationMethod - integer**
- **officeID - integer**
- **isBait - integer**
- **sentriconBaitTypeID - integer**
- **labelLink - string**
- **mixRatioNumerator - number**
- **mixRatioNumeratorUnit - string**
- **mixRatioDenominator - number**
- **mixRatioDenominatorUnit - string**
- **activeIngredientRate - number**
- **type - integer**
- **targetIssues - integer**: default Insect IDs
- **availableToTermite - integer**
- **pestControlCode - integer**

---

## /chemical/get

<a name="documentation_chemicalGetBulk"></a>

**Description:** Get Bulk data for chemical. Accepts an array of chemicalIDs. Returns a max of 1000 records.

### Parameters

- **chemicalIDs - array**

### Response

- **chemicalID - integer**
- **name - string**
- **manufacturer - string**
- **label - string**
- **ingredient1 - string**
- **ingredient2 - string**
- **ingredient3 - string**
- **percent1 - number**
- **percent2 - number**
- **percent3 - number**
- **epaNumber - string**
- **image - string**
- **description - string**
- **defaultDilution - number**
- **concentratedUnit - string**
- **dilutedUnit - string**
- **inventoryUnit - string**
- **applicationRate - string**
- **links - string**
- **msdsLink - string**
- **measurementType - integer**
- **visible - integer**
- **defaultApplicationMethod - integer**
- **officeID - integer**
- **isBait - integer**
- **sentriconBaitTypeID - integer**
- **labelLink - string**
- **mixRatioNumerator - number**
- **mixRatioNumeratorUnit - string**
- **mixRatioDenominator - number**
- **mixRatioDenominatorUnit - string**
- **activeIngredientRate - number**
- **type - integer**
- **targetIssues - integer**: default Insect IDs
- **availableToTermite - integer**
- **pestControlCode - integer**

---

## /chemical/search

<a name="documentation_chemicalSearch"></a>

**Description:** Provide a set of parameters which will return a list of ids. There is no limit to the number of IDs this will return. You can then supply these ids to the `get` endpoint in order to retrieve bulk data. Every parameter available supports a simple value OR a powerful query object that gives you access to all basic comparators. 

Example: dateAdded={"operator":">","value":"2016-01-01"}

Example: dateAdded={"operator\":\"BETWEEN\",\"value\":[\"2016-05-12\",\"2016-05-13\"]}

Available operators: >, <, >=, <=, =, !=, IN, BETWEEN, LIKE, STARTSWITH, ENDSWITH, CONTAINS.

Each of the search endpoints allows for an optional parameter 'includeData'. When sent, the API will additionally send the resolved objects for the first 1000 IDs. Keep in mind when using 'includeData' that if there are more than 1000 items an additional property '{entity}IDsNoDataExported' will specify the items that are not included in the resolved data array.

### Parameters

- **chemicalIDs - integer**: Primary key
- **officeIDs - integer**: Office ID region belongs to
- **name - string**: Name of the chemical
- **visible - string**: Visibility of the chemical
- **includeData - integer**: {0,1} Sends the resolved objects for the first 1000 IDs. If there are more than 1000 items an additional property chemicalIDsNoDataExported will specify the items that are not included in the resolved chemical array.

### Response

- **chemicalIDs - array**

---

## /chemicalUse/[id]

<a name="documentation_chemicalUseGetID"></a>

**Description:** Get chemicalUse data for single ID -- please provide a specific record ID in the URL structure.

### Parameters

- **-**

### Response

- **chemicalUseID - integer**
- **chemicalID - integer**
- **officeID - integer**
- **appointmentID - integer**
- **customerID - integer**
- **dateCreated - string**
- **createdBy - string**
- **serviceID - integer**
- **dilution - number**
- **dosage - number**
- **amount - number**
- **concentratedAmount - number**
- **concentratedUnit - string**
- **unit - string**
- **targetInsects - string**
- **locationsTreated - string**
- **applicationMethod - integer**
- **squareFoot - integer**
- **structureID - integer**
- **mixRatioNumerator - number**
- **mixRatioNumeratorUnit - string**
- **mixRatioDenominator - number**
- **mixRatioDenominatorUnit - string**
- **activeIngredientRate - number**
- **epaLot - string**
- **pestControlCode - integer**
- **dateUpdated - string**

---

## /chemicalUse/get

<a name="documentation_chemicalUseGetBulk"></a>

**Description:** Get Bulk data for chemicalUse. Accepts an array of chemicalUseIDs. Returns a max of 1000 records.

### Parameters

- **chemicalUseIDs - array**

### Response

- **chemicalUseID - integer**
- **chemicalID - integer**
- **officeID - integer**
- **appointmentID - integer**
- **customerID - integer**
- **dateCreated - string**
- **createdBy - string**
- **serviceID - integer**
- **dilution - number**
- **dosage - number**
- **amount - number**
- **concentratedAmount - number**
- **concentratedUnit - string**
- **unit - string**
- **targetInsects - string**
- **locationsTreated - string**
- **applicationMethod - integer**
- **squareFoot - integer**
- **structureID - integer**
- **mixRatioNumerator - number**
- **mixRatioNumeratorUnit - string**
- **mixRatioDenominator - number**
- **mixRatioDenominatorUnit - string**
- **activeIngredientRate - number**
- **epaLot - string**
- **pestControlCode - integer**
- **dateUpdated - string**

---

## /chemicalUse/search

<a name="documentation_chemicalUseSearch"></a>

**Description:** Provide a set of parameters which will return a list of ids. There is no limit to the number of IDs this will return. You can then supply these ids to the `get` endpoint in order to retrieve bulk data. Every parameter available supports a simple value OR a powerful query object that gives you access to all basic comparators. 

Example: dateAdded={"operator":">","value":"2016-01-01"}

Example: dateAdded={"operator\":\"BETWEEN\",\"value\":[\"2016-05-12\",\"2016-05-13\"]}

Available operators: >, <, >=, <=, =, !=, IN, BETWEEN, LIKE, STARTSWITH, ENDSWITH, CONTAINS.

Each of the search endpoints allows for an optional parameter 'includeData'. When sent, the API will additionally send the resolved objects for the first 1000 IDs. Keep in mind when using 'includeData' that if there are more than 1000 items an additional property '{entity}IDsNoDataExported' will specify the items that are not included in the resolved data array.

### Parameters

- **chemicalUseIDs - integer**: Primary key
- **chemicalUseID - integer**: Primary key alias
- **officeIDs - integer**: Office ID region belongs to
- **chemicalID - integer**: ID of the chemical Used
- **appointmentID - integer**
- **customerID - integer**
- **dateCreated - string**
- **createdBy - string**
- **serviceID - integer**
- **dateUpdated - string**
- **includeData - integer**: {0,1} Sends the resolved objects for the first 1000 IDs. If there are more than 1000 items an additional property chemicalUseIDsNoDataExported will specify the items that are not included in the resolved chemicalUse array.

### Response

- **chemicalUseIDs - array**

---

## /compassCustomer/[id]

<a name="documentation_compassCustomerGetID"></a>

**Description:** Get compassCustomer data for single ID -- please provide a specific record ID in the URL structure.

### Parameters

- **-**

### Response

- **customerID - integer**: Unique Identifier
- **officeID - integer**: The ID of the office this customer belongs to
- **name - string**: The name of the customer
- **dateAdded - string**
- **serviceType - string**: All subscriptions associated with the customer
- **contractValue - number**: Total contract value for all subscriptions associated with the customer

---

## /compassCustomer/get

<a name="documentation_compassCustomerGetBulk"></a>

**Description:** Get Bulk data for compassCustomer. Accepts an array of customerIDs. Returns a max of 1000 records.

### Parameters

- **customerIDs - array**

### Response

- **customerID - integer**: Unique Identifier
- **officeID - integer**: The ID of the office this customer belongs to
- **name - string**: The name of the customer
- **dateAdded - string**
- **serviceType - string**: All subscriptions associated with the customer
- **contractValue - number**: Total contract value for all subscriptions associated with the customer

---

## /compassCustomer/search

<a name="documentation_compassCustomerSearch"></a>

**Description:** Provide a set of parameters which will return a list of ids. There is no limit to the number of IDs this will return. You can then supply these ids to the `get` endpoint in order to retrieve bulk data. Every parameter available supports a simple value OR a powerful query object that gives you access to all basic comparators. 

Example: dateAdded={"operator":">","value":"2016-01-01"}

Example: dateAdded={"operator\":\"BETWEEN\",\"value\":[\"2016-05-12\",\"2016-05-13\"]}

Available operators: >, <, >=, <=, =, !=, IN, BETWEEN, LIKE, STARTSWITH, ENDSWITH, CONTAINS.

Each of the search endpoints allows for an optional parameter 'includeData'. When sent, the API will additionally send the resolved objects for the first 1000 IDs. Keep in mind when using 'includeData' that if there are more than 1000 items an additional property '{entity}IDsNoDataExported' will specify the items that are not included in the resolved data array.

### Parameters

- **- o**
- **1 - c**
- **2 - d**
- **includeData - integer**: {0,1} Sends the resolved objects for the first 1000 IDs. If there are more than 1000 items an additional property compassCustomerIDsNoDataExported will specify the items that are not included in the resolved compassCustomer array.

### Response

- **compassCustomerIDs - array**

---

## /contract/[id]

<a name="documentation_contractGetID"></a>

**Description:** Get contract data for single ID -- please provide a specific record ID in the URL structure.

### Parameters

- **includeDocumentLink - integer**: Send as 1 to retrieve a link to the document on AWS with a 15 day TTL.

### Response

- **contractIDs - integer**
- **contractID - integer**
- **customerIDs - integer**
- **subscriptionIDs - integer**
- **dateSigned - string**: The date the contract was signed.
- **dateAdded - string**: The date the contract was added.
- **documentState - integer**: State of the document e.g. WIP, COMPLETED
- **description - string**: description of the contract
- **dateUpdated - string**: The date the contract was last updated.

---

## /contract/create

<a name="documentation_contractCreate"></a>

**Description:** Create the default contract for the subscriptionID or subscriptionLink sent. If sending a signedFile, 
		    upload the file as multipart/form-data with parameter name uploadFile

### Parameters

- **subscriptionID - integer**: Foreign key to subscriptions table.
- **subscriptionLink - integer**: Alternative to subscriptionID. This is the "SubscriptionID" sent during an API insert through import/main.
- **emailCustomer - integer**: Set as 1 to also send a link to the customer via email.
- **dateSigned - string**: The date the contract was signed. Required if uploading a signed document. Date formats m/d/y or y-m-d
- **base64EncodedFile - string**: The Base64 encoded signed contract. Pass this if not sending the file.
- **notifyCustomerOnSignedAgreement - integer**: Set to 1 by default, will send out email to customer with contract as well as a first appointment reminder

---

## /contract/delete

<a name="documentation_contractDelete"></a>

**Description:** Delete an uploaded contract

### Parameters

- **contractID - integer**: Id of the contract to be deleted.

---

## /contract/get

<a name="documentation_contractGetBulk"></a>

**Description:** Get Bulk data for contract. Accepts an array of contractIDs. Returns a max of 1000 records.

### Parameters

- **contractIDs - array**
- **includeDocumentLink - int**: Send as 1 to retrieve a link to the document on AWS with a 15 day TTL.

### Response

- **contractIDs - integer**
- **contractID - integer**
- **customerIDs - integer**
- **subscriptionIDs - integer**
- **dateSigned - string**: The date the contract was signed.
- **dateAdded - string**: The date the contract was added.
- **documentState - integer**: State of the document e.g. WIP, COMPLETED
- **description - string**: description of the contract
- **dateUpdated - string**: The date the contract was last updated.

---

## /contract/search

<a name="documentation_contractSearch"></a>

**Description:** Provide a set of parameters which will return a list of ids. There is no limit to the number of IDs this will return. You can then supply these ids to the `get` endpoint in order to retrieve bulk data. Every parameter available supports a simple value OR a powerful query object that gives you access to all basic comparators. 

Example: dateAdded={"operator":">","value":"2016-01-01"}

Example: dateAdded={"operator\":\"BETWEEN\",\"value\":[\"2016-05-12\",\"2016-05-13\"]}

Available operators: >, <, >=, <=, =, !=, IN, BETWEEN, LIKE, STARTSWITH, ENDSWITH, CONTAINS.

Each of the search endpoints allows for an optional parameter 'includeData'. When sent, the API will additionally send the resolved objects for the first 1000 IDs. Keep in mind when using 'includeData' that if there are more than 1000 items an additional property '{entity}IDsNoDataExported' will specify the items that are not included in the resolved data array.

### Parameters

- **officeIDs - integer**
- **contractIDs - integer**
- **customerIDs - integer**
- **subscriptionIDs - integer**
- **dateSigned - string**: The date the contract was signed.
- **dateAdded - string**: The date the contract was added.
- **dateUpdated - string**: The date the contract was last updated.
- **includeData - integer**: {0,1} Sends the resolved objects for the first 1000 IDs. If there are more than 1000 items an additional property contractIDsNoDataExported will specify the items that are not included in the resolved contract array.

### Response

- **contractIDs - array**

---

## /contract/update

<a name="documentation_contractUpdate"></a>

### Parameters

- **contractID - integer - required**: ID of contract being updated
- **description - string**: Description of contract being updated

---

## /customer/[id]

<a name="documentation_customerGetID"></a>

**Description:** Get customer data for single ID -- please provide a specific record ID in the URL structure.

### Parameters

- **includeCancellationReason - integer**: Send as 1 to retrieve an array of cancellationNotes associated with each customer.
- **includeSubscriptions - integer**: Send as 1 to retrieve an array of subscriptions associated with each customer.
- **includeCustomerFlag - integer**: Send as 1 to retrieve an array of flags associated with each customer.
- **includeAdditionalContacts - integer**: Send as 1 to retrieve an array of additional contacts associated with each customer.
- **includePortalLogin - integer**: Send as 1 to retrieve additional properties portalLogin (full URL for customer login) and portalLoginExpires (datetime in PST). Portal token guarenteed valid for 3 days or longer.

### Response

- **customerID - integer**: Unique Identifier
- **billToAccountID - integer**: Billing Account which this subscription belongs to
- **officeID - integer**: The ID of the office this customer belongs to.
- **fname - string**: The first name of the customer
- **lname - string**: The last name of the customer.
- **companyName - string**: The company name of the customer.
- **spouse - string**: Spouse or alternate contact.
- **commercialAccount - integer**: 0: Not Commercial, 1: Commercial
- **status - integer**: 0: Inactive Customer, 1: Active Customer
- **statusText - string**: Friendly status
- **email - string**: Email Address of customer
- **phone1 - string**: The primary phone number of the customer
- **ext1 - string**: Extension for the primary phone of the customer
- **phone2 - string**: The secondary phone number of the customer
- **ext2 - string**: Extension for the secondary phone of the customer
- **address - string**: Customer Service Address
- **city - string**: Customer Service City
- **state - string**: Customer Service State
- **zip - string**: Customer Service Zip
- **billingCompanyName - string**: Billing Company Name
- **billingFName - string**: Billing First Name
- **billingLName - string**: Billing Last Name
- **billingCountryID - string**: Billing CountryID
- **billingAddress - string**: Billing Address
- **billingCity - string**: Billing City
- **billingState - string**: Billing State
- **billingZip - string**: Billing Zip
- **billingPhone - string**: Billing Phone
- **billingEmail - string**: Billing Email
- **lat - number**: Lattitude
- **lng - number**: Longitude
- **squareFeet - integer**: SquareFeet
- **addedByID - integer**: The user ID who created this customer
- **dateAdded - string**: The date this customer account was created.
- **dateCancelled - string**: The date this customer account was cancelled.
- **dateUpdated - string**: The date this customer was last changed.
- **sourceID - integer**: The source ID of how the customer was obtained
- **source - string**: Friendly version of the source
- **aPay - string**: Whether or not the customer is on auto pay
- **preferredTechID - integer**: The user ID of the preferred tech
- **paidInFull - integer**: Whether or not this customer prefers to pay in advance -- flag
- **subscriptionIDs - integer**: An array of subscription ID's attached to this customer
- **balance - number**: The total outstanding balance of the customer
- **balanceAge - integer**: The number of days this customer has owed any invoice.
- **responsibleBalance - number**: The total outstanding balance of the customer
- **responsibleBalanceAge - integer**: The number of days this customer has owed any invoice.
- **customerLink - string**: Customer Link from the that comes from the integration
- **masterAccount - string**: CustomerID for the master account in the connected property
- **preferredBillingDate - integer**: Preferred day for Billing
- **paymentHoldDate - string**: Payment Hold Date
- **mostRecentCreditCardLastFour - string**: Last 4 digits of most recently used Credit Card
- **mostRecentCreditCardExpirationDate - string**: Expiration date of most recently used Credit Card
- **appointmentIDs - integer**: An array of appointmentIDs associated with the customer
- **ticketIDs - integer**: An array of ticketIDs associated with the customer
- **paymentIDs - integer**: An array of paymentIDs associated with the customer
- **subscriptions - array**: An optional array of all subscription objects. Looks for the includeSubscriptions=true parameter
- **unitIDs - integer**: An array of unitIDs associated with the customer
- **regionID - integer**: RegionID of the customer
- **mapCode - string**: Mapcode of the customer
- **mapPage - string**: Mappage of the customer
- **specialScheduling - string**: Special Scheduling for the customer
- **taxRate - number**: Tax rate of the customer
- **stateTax - number**: State Tax rate of the customer
- **cityTax - number**: City Tax rate of the customer
- **countyTax - number**: County Tax rate of the customer
- **districtTax - number**: District Tax rate of the customer
- **districtTax1 - number**: District 1 Tax rate of the customer
- **districtTax2 - number**: District 2 Tax rate of the customer
- **districtTax3 - number**: District 3 Tax rate of the customer
- **districtTax4 - number**: District 4 Tax rate of the customer
- **districtTax5 - number**: District 5 Tax rate of the customer
- **customTax - number**: Custom Tax rate of the customer
- **zipTaxID - integer**: Zip Tax ID of the customer
- **smsReminders - integer**: Customer SMS reminder preference.
- **phoneReminders - integer**: Customer phone reminder preference.
- **emailReminders - integer**: Customer email reminder preference.
- **customerSource - string**: Customer source.
- **customerSourceID - string**: Customer sourceID.
- **maxMonthlyCharge - number**: Max monthly charge for the customer
- **county - string**: County name
- **useStructures - integer**: Set as 1 if the customer is marked as a structure customer (a customer can be residential, multi-unit, or structure)
- **isMultiUnit - integer**: Set as 1 if the customer is marked as a multi-unit customer (a customer can be residential, multi-unit, or structure)
- **autoPayPaymentProfileID - integer**: ID of the autopay paymentProfile attached to the customer
- **divisionID - integer**: divisionID of the customer
- **subPropertyTypeID - integer**: Sub-Property Type ID of the customer
- **agingDate - string**: Date the balance began.
- **responsibleAgingDate - string**: Date the responsibleBalance began.
- **salesmanAPay - integer**: Sales Rep APay customer flag
- **purpleDragon - integer**: Purple Dragon customer flag
- **termiteMonitoring - integer**: Switch Over customer flag
- **pendingCancel - integer**: Pending cancel customer flag

---

## /customer/create

<a name="documentation_customerCreate"></a>

**Description:** create a customer

### Parameters

- **billToAccountID - integer**
- **fname - string**: First name
- **lname - string**: Last name
- **spouse - string**
- **address - string**: Address string
- **city - string**: City string
- **state - string**: 2 letter state code
- **zip - string**: Zip code
- **mapCode - string**: Map Code
- **squareFeet - integer**
- **phone1 - string**
- **phone2 - string**
- **ext1 - string**
- **ext2 - string**
- **aPay - integer**: 0 - no APay, 1 - credit card apay, 2 ACH apay
- **maxMonthlyCharge - number**
- **paidInFull - integer**
- **preferredPayment - integer**
- **status - integer**
- **lat - number**
- **lng - number**
- **employeeID - integer**
- **notes - string**
- **termiteMonitoring - integer**
- **customerLink - string**: External ID, usually the primary key for your application
- **taxRate - number**
- **stateTax - number**
- **cityTax - number**
- **countyTax - number**
- **districtTax - number**
- **customTax - number**
- **customCode - string**
- **cityCode - string**
- **countyCode - string**
- **districtCode - string**
- **zipCityCounty - string**
- **smsReminders - integer**
- **phoneReminders - integer**
- **emailReminders - integer**
- **preferredTech - integer**
- **preferredBillingDate - string**
- **countyID - integer**
- **county - string**
- **countryID - string**: 2-letter Country code e.g. US
- **dateCancelled - string**
- **specialScheduling - string**
- **regionID - integer**
- **salesmanAPay - integer**
- **masterAccount - integer**: 0 if not part a master account or assigned to one; otherwise ID of the master account for this customer group
- **billTo - integer**
- **commercialAccount - integer**
- **companyName - string**
- **email - string**: email
- **sourceID - integer**: sourceID for the customer (from Admin > Preferences > Customer References > Customer Sources
- **divisionID - integer**
- **subPropertyTypeID - integer**
- **billingFName - string**: Billing First Name
- **billingLName - string**: Billing Last Name
- **billingCountryID - string**: Billing CountryID
- **billingAddress - string**: Billing Address
- **billingCity - string**: Billing City
- **billingState - string**: Billing State
- **billingZip - string**: Billing Zip
- **billingPhone - string**: Billing Phone
- **billingEmail - string**: Billing Email
- **billingCompanyName - string**: Billing billingCompanyName
- **billingPhoneExt - string**: Billing billingPhoneExt
- **billingPhone2 - string**: Billing billingPhone2
- **billingPhone2Ext - string**: Billing billingPhone2Ext
- **billingBusinessContactID - string**: Billing billingBusinessContactID
- **purpleDragon - integer**: Sets the Purple Dragon customer flag checkbox

---

## /customer/createPaymentProfile

<a name="documentation_customerCreatePaymentProfile"></a>

**Description:** Create a payment profile using a CreditCardToken and CreditCardTokenID from braintree/element

### Parameters

- **customerID - integer - required**: Foreign Key to customers table
- **CreditCardToken - string**: Required for braintree and element. Not required for nmi
- **CreditCardTokenID - string**: Required for braintree and nmi. Not required for element

### Response

- **id - integer**: Primary Key for paymentProfiles
- **customerID - integer**: Customer associated with the payment profile
- **profileID - string**: Credit card token associated with the payment processor
- **paymentProfileID - string**: Credit card token id associated with the payment processor
- **createdBy - integer**: EmployeeID who added the payment profile
- **dateCreated - string**: Date created
- **billingName - string**: Billing name
- **billingAddress1 - string**: Billing Address
- **billingCity - string**: Billing city
- **billingState - string**: Billing state
- **billingZip - integer**: Billing zip
- **billingCountryID - string**: Billing country
- **lastFour - string**: Last four digits of card number
- **expMonth - string**: Expiration month
- **expYear - string**: Expiration year

---

## /customer/get

<a name="documentation_customerGetBulk"></a>

**Description:** Get Bulk data for customer. Accepts an array of customerIDs. Returns a max of 1000 records.

### Parameters

- **customerIDs - array**
- **includeCancellationReason - int**: Send as 1 to retrieve an array of cancellationNotes associated with each customer.
- **includeSubscriptions - int**: Send as 1 to retrieve an array of subscriptions associated with each customer.
- **includeCustomerFlag - int**: Send as 1 to retrieve an array of flags associated with each customer.
- **includeAdditionalContacts - int**: Send as 1 to retrieve an array of additional contacts associated with each customer.
- **includePortalLogin - int**: Send as 1 to retrieve additional properties portalLogin (full URL for customer login) and portalLoginExpires (datetime in PST). Portal token guarenteed valid for 3 days or longer.

### Response

- **customerID - integer**: Unique Identifier
- **billToAccountID - integer**: Billing Account which this subscription belongs to
- **officeID - integer**: The ID of the office this customer belongs to.
- **fname - string**: The first name of the customer
- **lname - string**: The last name of the customer.
- **companyName - string**: The company name of the customer.
- **spouse - string**: Spouse or alternate contact.
- **commercialAccount - integer**: 0: Not Commercial, 1: Commercial
- **status - integer**: 0: Inactive Customer, 1: Active Customer
- **statusText - string**: Friendly status
- **email - string**: Email Address of customer
- **phone1 - string**: The primary phone number of the customer
- **ext1 - string**: Extension for the primary phone of the customer
- **phone2 - string**: The secondary phone number of the customer
- **ext2 - string**: Extension for the secondary phone of the customer
- **address - string**: Customer Service Address
- **city - string**: Customer Service City
- **state - string**: Customer Service State
- **zip - string**: Customer Service Zip
- **billingCompanyName - string**: Billing Company Name
- **billingFName - string**: Billing First Name
- **billingLName - string**: Billing Last Name
- **billingCountryID - string**: Billing CountryID
- **billingAddress - string**: Billing Address
- **billingCity - string**: Billing City
- **billingState - string**: Billing State
- **billingZip - string**: Billing Zip
- **billingPhone - string**: Billing Phone
- **billingEmail - string**: Billing Email
- **lat - number**: Lattitude
- **lng - number**: Longitude
- **squareFeet - integer**: SquareFeet
- **addedByID - integer**: The user ID who created this customer
- **dateAdded - string**: The date this customer account was created.
- **dateCancelled - string**: The date this customer account was cancelled.
- **dateUpdated - string**: The date this customer was last changed.
- **sourceID - integer**: The source ID of how the customer was obtained
- **source - string**: Friendly version of the source
- **aPay - string**: Whether or not the customer is on auto pay
- **preferredTechID - integer**: The user ID of the preferred tech
- **paidInFull - integer**: Whether or not this customer prefers to pay in advance -- flag
- **subscriptionIDs - integer**: An array of subscription ID's attached to this customer
- **balance - number**: The total outstanding balance of the customer
- **balanceAge - integer**: The number of days this customer has owed any invoice.
- **responsibleBalance - number**: The total outstanding balance of the customer
- **responsibleBalanceAge - integer**: The number of days this customer has owed any invoice.
- **customerLink - string**: Customer Link from the that comes from the integration
- **masterAccount - string**: CustomerID for the master account in the connected property
- **preferredBillingDate - integer**: Preferred day for Billing
- **paymentHoldDate - string**: Payment Hold Date
- **mostRecentCreditCardLastFour - string**: Last 4 digits of most recently used Credit Card
- **mostRecentCreditCardExpirationDate - string**: Expiration date of most recently used Credit Card
- **appointmentIDs - integer**: An array of appointmentIDs associated with the customer
- **ticketIDs - integer**: An array of ticketIDs associated with the customer
- **paymentIDs - integer**: An array of paymentIDs associated with the customer
- **subscriptions - array**: An optional array of all subscription objects. Looks for the includeSubscriptions=true parameter
- **unitIDs - integer**: An array of unitIDs associated with the customer
- **regionID - integer**: RegionID of the customer
- **mapCode - string**: Mapcode of the customer
- **mapPage - string**: Mappage of the customer
- **specialScheduling - string**: Special Scheduling for the customer
- **taxRate - number**: Tax rate of the customer
- **stateTax - number**: State Tax rate of the customer
- **cityTax - number**: City Tax rate of the customer
- **countyTax - number**: County Tax rate of the customer
- **districtTax - number**: District Tax rate of the customer
- **districtTax1 - number**: District 1 Tax rate of the customer
- **districtTax2 - number**: District 2 Tax rate of the customer
- **districtTax3 - number**: District 3 Tax rate of the customer
- **districtTax4 - number**: District 4 Tax rate of the customer
- **districtTax5 - number**: District 5 Tax rate of the customer
- **customTax - number**: Custom Tax rate of the customer
- **zipTaxID - integer**: Zip Tax ID of the customer
- **smsReminders - integer**: Customer SMS reminder preference.
- **phoneReminders - integer**: Customer phone reminder preference.
- **emailReminders - integer**: Customer email reminder preference.
- **customerSource - string**: Customer source.
- **customerSourceID - string**: Customer sourceID.
- **maxMonthlyCharge - number**: Max monthly charge for the customer
- **county - string**: County name
- **useStructures - integer**: Set as 1 if the customer is marked as a structure customer (a customer can be residential, multi-unit, or structure)
- **isMultiUnit - integer**: Set as 1 if the customer is marked as a multi-unit customer (a customer can be residential, multi-unit, or structure)
- **autoPayPaymentProfileID - integer**: ID of the autopay paymentProfile attached to the customer
- **divisionID - integer**: divisionID of the customer
- **subPropertyTypeID - integer**: Sub-Property Type ID of the customer
- **agingDate - string**: Date the balance began.
- **responsibleAgingDate - string**: Date the responsibleBalance began.
- **salesmanAPay - integer**: Sales Rep APay customer flag
- **purpleDragon - integer**: Purple Dragon customer flag
- **termiteMonitoring - integer**: Switch Over customer flag
- **pendingCancel - integer**: Pending cancel customer flag

---

## /customer/search

<a name="documentation_customerSearch"></a>

**Description:** Provide a set of parameters which will return a list of ids. There is no limit to the number of IDs this will return. You can then supply these ids to the `get` endpoint in order to retrieve bulk data. Every parameter available supports a simple value OR a powerful query object that gives you access to all basic comparators. 

Example: dateAdded={"operator":">","value":"2016-01-01"}

Example: dateAdded={"operator\":\"BETWEEN\",\"value\":[\"2016-05-12\",\"2016-05-13\"]}

Available operators: >, <, >=, <=, =, !=, IN, BETWEEN, LIKE, STARTSWITH, ENDSWITH, CONTAINS.

Each of the search endpoints allows for an optional parameter 'includeData'. When sent, the API will additionally send the resolved objects for the first 1000 IDs. Keep in mind when using 'includeData' that if there are more than 1000 items an additional property '{entity}IDsNoDataExported' will specify the items that are not included in the resolved data array.

### Parameters

- **officeIDs - integer**
- **active - integer**: Whether or not this customer is 'Active': 1 or 'Inactive': 0.
- **customerIDs - integer**: Unique Identifier
- **dateAdded - string**: The date this customer was created or added.
- **dateCancelled - string**: The date this customer was cancelled.
- **dateUpdated - string**: Last date this customer record was updated.
- **aPay - integer**: Auto Pay status: 0-Not on Auto Pay, 1-Auto Pay CC, 2-AutoPay ACH
- **lname - string**: Customer's last name
- **fname - string**: Customer's first name
- **address - string**: Customer's address
- **city - string**: Customer's city
- **state - string**: Customer's state
- **zip - string**: Customer's zip code
- **dateUpdatedStart - string**
- **dateUpdatedEnd - string**
- **dateAddedStart - string**
- **dateAddedEnd - string**
- **masterAccount - integer**: CustomerID for the master account in the connected property
- **balanceAge - integer**: Balance age in days. Available filters: >, <, >=, <=, =, !=, IN, BETWEEN
- **agingDate - string**: Date the balance began.
- **responsibleBalanceAge - integer**: Responsible balance age in days. Available filters: >, <, >=, <=, =, !=, IN, BETWEEN
- **responsibleAgingDate - string**: Date the responsibleBalance began.
- **phone - integer**: Match any 10-digit phone number (phone1, phone2, or additionalContact phone). Numbers only.
- **phone1 - integer**: Primary 10-digit phone number. Numbers only.
- **phone2 - integer**: Secondary 10-digit phone number. Numbers only.
- **additionalPhone - integer**: Additional contact 10-digit phone number. Numbers only.
- **billingPhone - integer**: Billing 10-digit phone number. Numbers only.
- **companyName - string**: Company name of the customer.
- **customerLink - string**: Search by the CustomerID specified on import/main.
- **regionID - integer**: RegionID of the customer
- **email - string**: Customer's email
- **employeeID - integer**: EmployeeID who added the customer
- **addedByID - integer**: EmployeeID who added the customer
- **autoPayPaymentProfileID - integer**: ID of the autopay paymentProfile attached to the customer
- **balance - integer**: Customer balance amount. Available filters: >, <, >=, <=, =, !=, IN, BETWEEN
- **responsibleBalance - integer**: Responsible balance amount. Available filters: >, <, >=, <=, =, !=, IN, BETWEEN
- **includeData - integer**: {0,1} Sends the resolved objects for the first 1000 IDs. If there are more than 1000 items an additional property customerIDsNoDataExported will specify the items that are not included in the resolved customer array.

### Response

- **customerIDs - array**

---

## /customer/update

<a name="documentation_customerUpdate"></a>

**Description:** Update customer details

### Parameters

- **billToAccountID - integer**
- **fname - string**: First name
- **lname - string**: Last name
- **spouse - string**
- **address - string**: Address string
- **city - string**: City string
- **state - string**: 2 letter state code
- **zip - string**: Zip code
- **mapCode - string**: Map Code
- **squareFeet - integer**
- **phone1 - string**
- **phone2 - string**
- **ext1 - string**
- **ext2 - string**
- **aPay - integer**: 0 - no APay, 1 - credit card apay, 2 ACH apay
- **maxMonthlyCharge - number**
- **paidInFull - integer**
- **preferredPayment - integer**
- **status - integer**
- **lat - number**
- **lng - number**
- **employeeID - integer**
- **notes - string**
- **termiteMonitoring - integer**
- **customerLink - string**: External ID, usually the primary key for your application
- **taxRate - number**
- **stateTax - number**
- **cityTax - number**
- **countyTax - number**
- **districtTax - number**
- **customTax - number**
- **customCode - string**
- **cityCode - string**
- **countyCode - string**
- **districtCode - string**
- **zipCityCounty - string**
- **smsReminders - integer**
- **phoneReminders - integer**
- **emailReminders - integer**
- **preferredTech - integer**
- **preferredBillingDate - string**
- **countyID - integer**
- **county - string**
- **countryID - string**: 2-letter Country code e.g. US
- **dateCancelled - string**
- **specialScheduling - string**
- **regionID - integer**
- **salesmanAPay - integer**
- **masterAccount - integer**: 0 if not part a master account or assigned to one; otherwise ID of the master account for this customer group
- **billTo - integer**
- **commercialAccount - integer**
- **companyName - string**
- **email - string**: email
- **sourceID - integer**: sourceID for the customer (from Admin > Preferences > Customer References > Customer Sources
- **divisionID - integer**
- **subPropertyTypeID - integer**
- **billingFName - string**: Billing First Name
- **billingLName - string**: Billing Last Name
- **billingCountryID - string**: Billing CountryID
- **billingAddress - string**: Billing Address
- **billingCity - string**: Billing City
- **billingState - string**: Billing State
- **billingZip - string**: Billing Zip
- **billingPhone - string**: Billing Phone
- **billingEmail - string**: Billing Email
- **billingCompanyName - string**: Billing billingCompanyName
- **billingPhoneExt - string**: Billing billingPhoneExt
- **billingPhone2 - string**: Billing billingPhone2
- **billingPhone2Ext - string**: Billing billingPhone2Ext
- **billingBusinessContactID - string**: Billing billingBusinessContactID
- **purpleDragon - integer**: Sets the Purple Dragon customer flag checkbox
- **customerID - integer - required**: Primary key to the customers table.

---

## /customer/updatePaymentProfile

<a name="documentation_customerUpdatePaymentProfile"></a>

**Description:** Update billing information of existing payment profile for a customer

### Parameters

- **customerID - integer - required**: Foreign Key to customers table
- **billingName - string**: Billing name associated with payment profile
- **billingAddress1 - string**: Billing address associated with payment profile
- **billingCity - string**: Billing city associated with payment profile
- **billingState - string**: Billing state associated with payment profile
- **billingZip - integer**: Billing zip code associated with payment profile
- **billingCountryID - string**: Billing country code associated with payment profile

### Response

- **id - integer**: Primary Key for paymentProfiles
- **customerID - integer**: Customer associated with the payment profile
- **profileID - string**: Credit card token associated with the payment processor
- **paymentProfileID - string**: Credit card token id associated with the payment processor
- **createdBy - integer**: EmployeeID who added the payment profile
- **dateCreated - string**: Date created
- **billingName - string**: Billing name
- **billingAddress1 - string**: Billing Address
- **billingCity - string**: Billing city
- **billingState - string**: Billing state
- **billingZip - integer**: Billing zip
- **billingCountryID - string**: Billing country
- **lastFour - string**: Last four digits of card number
- **expMonth - string**: Expiration month
- **expYear - string**: Expiration year

---

## /customerFlag/[id]

<a name="documentation_customerFlagGetID"></a>

**Description:** Get customerFlag data for single ID -- please provide a specific record ID in the URL structure.
 This function has an addition standard filter for customerFlags that will help squelch unnecessary flags.

### Parameters

- **limitCustomerFlags - string**: Standard search filter. E.G. "limitCustomerFlags": {"operator":"IN","value":["myFlag","yourflag"}

### Response

- **customerID - integer**: CustomerID
- **flag - string**: Flag Code
- **flagValue - string**: Flag Value

---

## /customerFlag/get

<a name="documentation_customerFlagGetBulk"></a>

**Description:** Get Bulk data for customerFlag. Accepts an array of customerIDs. Returns a max of 1000 records.
 This function has an addition standard filter for customerFlags that will help squelch unnecessary flags.

### Parameters

- **customerIDs - array**
- **limitCustomerFlags - string**: Standard search filter. E.G. "limitCustomerFlags": {"operator":"IN","value":["myFlag","yourflag"}

### Response

- **customerID - integer**: CustomerID
- **flag - string**: Flag Code
- **flagValue - string**: Flag Value

---

## /customerFlag/search

<a name="documentation_customerFlagSearch"></a>

**Description:** Provide a set of parameters which will return a list of ids. There is no limit to the number of IDs this will return. You can then supply these ids to the `get` endpoint in order to retrieve bulk data. Every parameter available supports a simple value OR a powerful query object that gives you access to all basic comparators. 

Example: dateAdded={"operator":">","value":"2016-01-01"}

Example: dateAdded={"operator\":\"BETWEEN\",\"value\":[\"2016-05-12\",\"2016-05-13\"]}

Available operators: >, <, >=, <=, =, !=, IN, BETWEEN, LIKE, STARTSWITH, ENDSWITH, CONTAINS.

Each of the search endpoints allows for an optional parameter 'includeData'. When sent, the API will additionally send the resolved objects for the first 1000 IDs. Keep in mind when using 'includeData' that if there are more than 1000 items an additional property '{entity}IDsNoDataExported' will specify the items that are not included in the resolved data array.

### Parameters

- **customerIDs - integer**
- **customerFlags - string**: Limit using user-defined generic flags or system flags: paidInFull, switchOver, purpleDragon, pendingCancellation, prefersPaper, collectonsStage
- **includeData - integer**: {0,1} Sends the resolved objects for the first 1000 IDs. If there are more than 1000 items an additional property customerFlagIDsNoDataExported will specify the items that are not included in the resolved customerFlag array.

### Response

- **customerFlagIDs - array**

---

## /customerFlag/update

<a name="documentation_customerFlagUpdate"></a>

### Parameters

- **customerID - integer - required**: ID of customer the flags are to be set to
- **paidInFull - integer**: Pass 1 to set Paid In Full flag, 0 to unset
- **termiteMonitoring - integer**: Pass 1 to set Switch Over flag, 0 to unset
- **purpleDragon - integer**: Pass 1 to set Purple Dragon flag, 0 to unset
- **salesmanAPay - integer**: Pass 1 to set Sales Rep APay flag, 0 to unset
- **prefersPaper - integer**: Pass 1 to set Prefers Paper flag, 0 to unset
- **pendingCancel - integer**: Pass 1 to set Pending Cancel flag, 0 to unset
- **pendingCancelReasonID - integer**: Cancellation Reason ID, required if setting the Pending Cancel flag
- **pendingCancelNotes - string**: Pending Cancel Notes

---

## /customerSource/[id]

<a name="documentation_customerSourceGetID"></a>

**Description:** Get customerSource data for single ID -- please provide a specific record ID in the URL structure.

### Parameters

- **-**

### Response

- **sourceID - integer**: Primary key
- **officeID - integer**: Office ID region belongs to
- **source - string**: Name of the source
- **salesRoutesDefault - integer**: Set as 1 if this is a default source for the mobile app
- **visible - string**: Visibility of the source
- **dealsSource - integer**: set as 1 if source is deals

---

## /customerSource/get

<a name="documentation_customerSourceGetBulk"></a>

**Description:** Get Bulk data for customerSource. Accepts an array of sourceIDs. Returns a max of 1000 records.

### Parameters

- **sourceIDs - array**

### Response

- **sourceID - integer**: Primary key
- **officeID - integer**: Office ID region belongs to
- **source - string**: Name of the source
- **salesRoutesDefault - integer**: Set as 1 if this is a default source for the mobile app
- **visible - string**: Visibility of the source
- **dealsSource - integer**: set as 1 if source is deals

---

## /customerSource/search

<a name="documentation_customerSourceSearch"></a>

**Description:** Provide a set of parameters which will return a list of ids. There is no limit to the number of IDs this will return. You can then supply these ids to the `get` endpoint in order to retrieve bulk data. Every parameter available supports a simple value OR a powerful query object that gives you access to all basic comparators. 

Example: dateAdded={"operator":">","value":"2016-01-01"}

Example: dateAdded={"operator\":\"BETWEEN\",\"value\":[\"2016-05-12\",\"2016-05-13\"]}

Available operators: >, <, >=, <=, =, !=, IN, BETWEEN, LIKE, STARTSWITH, ENDSWITH, CONTAINS.

Each of the search endpoints allows for an optional parameter 'includeData'. When sent, the API will additionally send the resolved objects for the first 1000 IDs. Keep in mind when using 'includeData' that if there are more than 1000 items an additional property '{entity}IDsNoDataExported' will specify the items that are not included in the resolved data array.

### Parameters

- **sourceID - integer**: Primary key
- **sourceIDs - integer**: Primary key alias
- **customerSourceID - integer**: Primary key alias
- **officeID - integer**: Office ID region belongs to
- **officeIDs - integer**: Office ID region belongs to
- **source - string**: Name of the source
- **salesRoutesDefault - integer**: Set as 1 if this is a default source for the mobile app
- **visible - string**: Visibility of the source
- **includeData - integer**: {0,1} Sends the resolved objects for the first 1000 IDs. If there are more than 1000 items an additional property customerSourceIDsNoDataExported will specify the items that are not included in the resolved customerSource array.

### Response

- **customerSourceIDs - array**

---

## /diagram/[id]

<a name="documentation_diagramGetID"></a>

**Description:** Get diagram data for single ID -- please provide a specific record ID in the URL structure.

### Parameters

- **-**

### Response

- **diagram - integer**
- **customerID - integer**
- **description - string**: Diagram description.
- **dateCreated - string**: The date the diagram was added.
- **dateUpdated - string**: The date the diagram was updated.
- **diagramObject - array**: The diagram object
- **createdBy - integer**: The employeeID who created the diagram.
- **diagramType - string**: Type of diagram ['WDO','PROPERTY ESTIMATION'].
- **measurement - integer**
- **measurementUnit - string**: ['SF','LF','QTY']

---

## /diagram/get

<a name="documentation_diagramGetBulk"></a>

**Description:** Get Bulk data for diagram. Accepts an array of diagramIDs. Returns a max of 1000 records.

### Parameters

- **diagramIDs - array**

### Response

- **diagram - integer**
- **customerID - integer**
- **description - string**: Diagram description.
- **dateCreated - string**: The date the diagram was added.
- **dateUpdated - string**: The date the diagram was updated.
- **diagramObject - array**: The diagram object
- **createdBy - integer**: The employeeID who created the diagram.
- **diagramType - string**: Type of diagram ['WDO','PROPERTY ESTIMATION'].
- **measurement - integer**
- **measurementUnit - string**: ['SF','LF','QTY']

---

## /diagram/search

<a name="documentation_diagramSearch"></a>

**Description:** Provide a set of parameters which will return a list of ids. There is no limit to the number of IDs this will return. You can then supply these ids to the `get` endpoint in order to retrieve bulk data. Every parameter available supports a simple value OR a powerful query object that gives you access to all basic comparators. 

Example: dateAdded={"operator":">","value":"2016-01-01"}

Example: dateAdded={"operator\":\"BETWEEN\",\"value\":[\"2016-05-12\",\"2016-05-13\"]}

Available operators: >, <, >=, <=, =, !=, IN, BETWEEN, LIKE, STARTSWITH, ENDSWITH, CONTAINS.

Each of the search endpoints allows for an optional parameter 'includeData'. When sent, the API will additionally send the resolved objects for the first 1000 IDs. Keep in mind when using 'includeData' that if there are more than 1000 items an additional property '{entity}IDsNoDataExported' will specify the items that are not included in the resolved data array.

### Parameters

- **diagramIDs - integer**
- **officeIDs - integer**
- **officeID - integer**
- **customerID - integer**
- **dateUpdated - string**: The date the diagram was updated.
- **diagramType - string**: Type of diagram ['WDO','PROPERTY ESTIMATION'].
- **includeData - integer**: {0,1} Sends the resolved objects for the first 1000 IDs. If there are more than 1000 items an additional property diagramIDsNoDataExported will specify the items that are not included in the resolved diagram array.

### Response

- **diagramIDs - array**

---

## /diagram/update

<a name="documentation_diagramUpdate"></a>

### Parameters

- **diagramID - integer - required**: ID of diagram being updated
- **measurement - integer**: e.g. linear footage, square footage, or quantity
- **measurementUnit - string**: ['SF','LF','QTY']

---

## /disbursement/[id]

<a name="documentation_disbursementGetID"></a>

**Description:** Get disbursement data for single ID -- please provide a specific record ID in the URL structure.

### Parameters

- **-**

### Response

- **gatewayDisbursementID - integer**
- **dateCreated - string**
- **dateUpdated - string**
- **amount - number**

---

## /disbursement/get

<a name="documentation_disbursementGetBulk"></a>

**Description:** Get Bulk data for disbursement. Accepts an array of gatewayDisbursementIDs. Returns a max of 1000 records.

### Parameters

- **gatewayDisbursementIDs - array**

### Response

- **gatewayDisbursementID - integer**
- **dateCreated - string**
- **dateUpdated - string**
- **amount - number**

---

## /disbursement/search

<a name="documentation_disbursementSearch"></a>

**Description:** Provide a set of parameters which will return a list of ids. There is no limit to the number of IDs this will return. You can then supply these ids to the `get` endpoint in order to retrieve bulk data. Every parameter available supports a simple value OR a powerful query object that gives you access to all basic comparators. 

Example: dateAdded={"operator":">","value":"2016-01-01"}

Example: dateAdded={"operator\":\"BETWEEN\",\"value\":[\"2016-05-12\",\"2016-05-13\"]}

Available operators: >, <, >=, <=, =, !=, IN, BETWEEN, LIKE, STARTSWITH, ENDSWITH, CONTAINS.

Each of the search endpoints allows for an optional parameter 'includeData'. When sent, the API will additionally send the resolved objects for the first 1000 IDs. Keep in mind when using 'includeData' that if there are more than 1000 items an additional property '{entity}IDsNoDataExported' will specify the items that are not included in the resolved data array.

### Parameters

- **gatewayDisbursementIDs - integer**: Primary key
- **gatewayDisbursementID - integer**: Primary key alias
- **dateCreated - string**: Date created
- **dateUpdated - string**: Date last updated
- **includeData - integer**: {0,1} Sends the resolved objects for the first 1000 IDs. If there are more than 1000 items an additional property disbursementIDsNoDataExported will specify the items that are not included in the resolved disbursement array.

### Response

- **disbursementIDs - array**

---

## /disbursementItem/[id]

<a name="documentation_disbursementItemGetID"></a>

**Description:** Get disbursementItem data for single ID -- please provide a specific record ID in the URL structure.

### Parameters

- **-**

### Response

- **gatewayDisbursementEntryID - integer**
- **gatewayDisbursementID - integer**
- **dateCreated - string**
- **dateUpdated - string**
- **billingFirstName - string**
- **billingLastName - string**
- **amount - number**
- **actualAmount - number**
- **description - string**
- **isFee - integer**
- **gatewayEventID - integer**
- **gatewayEventType - string**
- **gatewayEventFeeType - string**
- **gatewayEventDescription - string**

---

## /disbursementItem/get

<a name="documentation_disbursementItemGetBulk"></a>

**Description:** Get Bulk data for disbursementItem. Accepts an array of gatewayDisbursementEntryIDs. Returns a max of 1000 records.

### Parameters

- **gatewayDisbursementEntryIDs - array**

### Response

- **gatewayDisbursementEntryID - integer**
- **gatewayDisbursementID - integer**
- **dateCreated - string**
- **dateUpdated - string**
- **billingFirstName - string**
- **billingLastName - string**
- **amount - number**
- **actualAmount - number**
- **description - string**
- **isFee - integer**
- **gatewayEventID - integer**
- **gatewayEventType - string**
- **gatewayEventFeeType - string**
- **gatewayEventDescription - string**

---

## /disbursementItem/search

<a name="documentation_disbursementItemSearch"></a>

**Description:** Provide a set of parameters which will return a list of ids. There is no limit to the number of IDs this will return. You can then supply these ids to the `get` endpoint in order to retrieve bulk data. Every parameter available supports a simple value OR a powerful query object that gives you access to all basic comparators. 

Example: dateAdded={"operator":">","value":"2016-01-01"}

Example: dateAdded={"operator\":\"BETWEEN\",\"value\":[\"2016-05-12\",\"2016-05-13\"]}

Available operators: >, <, >=, <=, =, !=, IN, BETWEEN, LIKE, STARTSWITH, ENDSWITH, CONTAINS.

Each of the search endpoints allows for an optional parameter 'includeData'. When sent, the API will additionally send the resolved objects for the first 1000 IDs. Keep in mind when using 'includeData' that if there are more than 1000 items an additional property '{entity}IDsNoDataExported' will specify the items that are not included in the resolved data array.

### Parameters

- **gatewayDisbursementEntryIDs - integer**: Primary key
- **gatewayDisbursementEntryID - integer**: Primary key alias
- **gatewayDisbursementID - integer**: Key to gatewayDisbursements table
- **dateCreated - string**: Date created
- **dateUpdated - string**: Date last updated
- **includeData - integer**: {0,1} Sends the resolved objects for the first 1000 IDs. If there are more than 1000 items an additional property disbursementItemIDsNoDataExported will specify the items that are not included in the resolved disbursementItem array.

### Response

- **disbursementItemIDs - array**

---

## /document/[id]

<a name="documentation_documentGetID"></a>

**Description:** Get document data for single ID -- please provide a specific record ID in the URL structure.

### Parameters

- **includeDocumentLink - integer**: Send as 1 to retrieve a link to the document on AWS with a 15 day TTL.

### Response

- **uploadID - integer**: Unique Identifier
- **officeID - integer**
- **customerID - integer**: Customer ID
- **dateAdded - string**: date this upload was added
- **addedBy - integer**: Employee ID that added this
- **description - string**: Description for this upload
- **showCustomer - integer**: Set to 1 if this upload is visible to the customer
- **showTech - integer**: Set to 1 if this upload is visible to the technician through the mobile app.
- **appointmentID - integer**: Appointment ID this upload relates to.
- **prefix - integer**: origination database prefix
- **dateUpdated - string**: date document was last updated

---

## /document/create

<a name="documentation_documentCreate"></a>

**Description:** Upload file as multipart/form-data with parameter name uploadFile

### Parameters

- **customerID - integer - required**: Customer ID this document relates to.
- **description - integer - required**: Description for this document
- **appointmentID - integer**: Appointment ID this document relates to
- **showCustomer - bool**: If set true this document will be accessable to the customer it is attached to.
- **showTech - bool**: If set true this document will be accessable to technicians servicing this customer.

---

## /document/createEncoded

<a name="documentation_documentCreateEncoded"></a>

**Description:** Allows file upload using a Base64 representation submitted through POST, GET or query string parameters

### Parameters

- **customerID - integer - required**: Customer ID this document relates to.
- **description - integer - required**: Description for this document
- **appointmentID - integer**: Appointment ID this document relates to
- **showCustomer - bool**: If set true this document will be accessable to the customer it is attached to.
- **showTech - bool**: If set true this document will be accessable to technicians servicing this customer.
- **encodedFile - string - required**: Base64 representation of a file.
- **filename - string - required**: Name of encoded file

---

## /document/delete

<a name="documentation_documentDelete"></a>

**Description:** Delete a customer upload

### Parameters

- **customerID - integer - required**: CustomerID to delete from.
- **uploadID - integer - required**: UploadID to delete.

---

## /document/get

<a name="documentation_documentGetBulk"></a>

**Description:** Get Bulk data for document. Accepts an array of uploadIDs. Returns a max of 1000 records.

### Parameters

- **uploadIDs - array**
- **includeDocumentLink - int**: Send as 1 to retrieve a link to the document on AWS with a 15 day TTL.

### Response

- **uploadID - integer**: Unique Identifier
- **officeID - integer**
- **customerID - integer**: Customer ID
- **dateAdded - string**: date this upload was added
- **addedBy - integer**: Employee ID that added this
- **description - string**: Description for this upload
- **showCustomer - integer**: Set to 1 if this upload is visible to the customer
- **showTech - integer**: Set to 1 if this upload is visible to the technician through the mobile app.
- **appointmentID - integer**: Appointment ID this upload relates to.
- **prefix - integer**: origination database prefix
- **dateUpdated - string**: date document was last updated

---

## /document/search

<a name="documentation_documentSearch"></a>

**Description:** Provide a set of parameters which will return a list of ids. There is no limit to the number of IDs this will return. You can then supply these ids to the `get` endpoint in order to retrieve bulk data. Every parameter available supports a simple value OR a powerful query object that gives you access to all basic comparators. 

Example: dateAdded={"operator":">","value":"2016-01-01"}

Example: dateAdded={"operator\":\"BETWEEN\",\"value\":[\"2016-05-12\",\"2016-05-13\"]}

Available operators: >, <, >=, <=, =, !=, IN, BETWEEN, LIKE, STARTSWITH, ENDSWITH, CONTAINS.

Each of the search endpoints allows for an optional parameter 'includeData'. When sent, the API will additionally send the resolved objects for the first 1000 IDs. Keep in mind when using 'includeData' that if there are more than 1000 items an additional property '{entity}IDsNoDataExported' will specify the items that are not included in the resolved data array.

### Parameters

- **uploadIDs - integer**
- **officeIDs - integer**
- **officeID - integer**
- **customerIDs - integer**: customerID associated with the document
- **customerID - integer**: customerID associated with the document
- **appointmentIDs - integer**: appointmentID associated with the document
- **appointmentID - integer**: appointmentID associated with the document
- **formTemplateID - integer**: formTemplateID for pulling specific form types
- **dateAdded - string**
- **dateUpdated - string**
- **includeData - integer**: {0,1} Sends the resolved objects for the first 1000 IDs. If there are more than 1000 items an additional property documentIDsNoDataExported will specify the items that are not included in the resolved document array.

### Response

- **documentIDs - array**

---

## /document/update

<a name="documentation_documentUpdate"></a>

**Description:** Update the attributes of a customer upload.

### Parameters

- **customerID - integer - required**: Customer ID this document relates to.
- **description - integer - required**: Description for this document
- **appointmentID - integer**: Appointment ID this document relates to
- **showCustomer - bool**: If set true this document will be accessable to the customer it is attached to.
- **showTech - bool**: If set true this document will be accessable to technicians servicing this customer.
- **uploadID - integer - required**: ID of upload to update

---

## /door/[id]

<a name="documentation_doorGetID"></a>

**Description:** Get door data for single ID -- please provide a specific record ID in the URL structure.

### Parameters

- **-**

### Response

- **doorID - integer**: doorID
- **lat - number**: lat
- **lng - number**: lng
- **timeCreated - string**: timeCreated
- **employeeID - integer**: employeeID
- **name - string**: name
- **address - string**: address
- **city - string**: city
- **state - string**: state
- **zip - string**: zip
- **phone - string**: phone
- **status - integer**: status
- **notes - string**: notes
- **email - string**: email
- **callbackTime - string**: callbackTime
- **knockCounter - integer**: knockCounter
- **countryID - string**: countryID

---

## /door/get

<a name="documentation_doorGetBulk"></a>

**Description:** Get Bulk data for door. Accepts an array of doorIDs. Returns a max of 1000 records.

### Parameters

- **doorIDs - array**

### Response

- **doorID - integer**: doorID
- **lat - number**: lat
- **lng - number**: lng
- **timeCreated - string**: timeCreated
- **employeeID - integer**: employeeID
- **name - string**: name
- **address - string**: address
- **city - string**: city
- **state - string**: state
- **zip - string**: zip
- **phone - string**: phone
- **status - integer**: status
- **notes - string**: notes
- **email - string**: email
- **callbackTime - string**: callbackTime
- **knockCounter - integer**: knockCounter
- **countryID - string**: countryID

---

## /door/search

<a name="documentation_doorSearch"></a>

**Description:** Provide a set of parameters which will return a list of ids. There is no limit to the number of IDs this will return. You can then supply these ids to the `get` endpoint in order to retrieve bulk data. Every parameter available supports a simple value OR a powerful query object that gives you access to all basic comparators. 

Example: dateAdded={"operator":">","value":"2016-01-01"}

Example: dateAdded={"operator\":\"BETWEEN\",\"value\":[\"2016-05-12\",\"2016-05-13\"]}

Available operators: >, <, >=, <=, =, !=, IN, BETWEEN, LIKE, STARTSWITH, ENDSWITH, CONTAINS.

Each of the search endpoints allows for an optional parameter 'includeData'. When sent, the API will additionally send the resolved objects for the first 1000 IDs. Keep in mind when using 'includeData' that if there are more than 1000 items an additional property '{entity}IDsNoDataExported' will specify the items that are not included in the resolved data array.

### Parameters

- **doorID - integer**: doorID
- **lat - number**: lat
- **lng - number**: lng
- **employeeID - integer**: employeeID
- **searchDistance - integer**: Size in miles of the search grid when using centerLat, centerLng filters.
- **centerLat - number**: Latitude of search radius center. Default distance 50 miles; override with searchDistance parameter. centerLng must also be set to use this filter
- **centerLng - number**: Longitude of search radius center. Default distance 50 miles; override with searchDistance parameter. centerLat must also be set to use this filter
- **dateCreated - string**: alias of timeCreated
- **timeCreated - string**: timeCreated
- **includeData - integer**: {0,1} Sends the resolved objects for the first 1000 IDs. If there are more than 1000 items an additional property doorIDsNoDataExported will specify the items that are not included in the resolved door array.

### Response

- **doorIDs - array**

---

## /employee/[id]

<a name="documentation_employeeGetID"></a>

**Description:** Get employee data for single ID -- please provide a specific record ID in the URL structure.

### Parameters

- **includeCommissionData - integer**: Send as 1 to retrieve additional commission data for the employee.

### Response

- **employeeID - integer**: Unique Identifier
- **officeID - integer**: Office ID this employee belongs to
- **active - integer**: 0: Inactive account, 1: Active account
- **fname - string**: Employee's first name
- **lname - string**: Employee's last name
- **initials - string**: Employee's name initials -- user defined in case of duplicate's
- **nickname - string**: Employee's nickname
- **type - integer**: Employee type. 0: Office Staff, 1: Technician, 2: Sales Rep
- **phone - string**: Phone number
- **email - integer**: Unique Identifier
- **username - string**: Employees username
- **experience - integer**: Years of experience of the rep -- mostly to distinguish rookies from veterans
- **skillIDs - integer**: IDs of skills associated with the technician
- **skillDescriptions - integer**: Descriptions of skills associated with the technician
- **pic - string**: URL of the employee image
- **linkedEmployeeIDs - integer**: The master account if this employee is linked to other accounts in other offices. For reporting purposes their stats are typically combined.
- **employeeLink - string**: Employee's Link
- **licenseNumber - string**: License Number
- **supervisorID - integer**: EmployeeID of supervisor
- **roamingRep - integer**: The master employeeID if this employee is linked to other accounts in other offices. Set as 0 if the account cannot roam.
- **regionalManagerOfficeIDs - integer**: List of officeIDs this employee is a regional manager of
- **lastLogin - string**: date of last login
- **teamIDs - integer**: The master employeeID if this employee is linked to other accounts in other offices. Set as 0 if the account cannot roam.
- **primaryTeam - integer**: The master employeeID if this employee is linked to other accounts in other offices. Set as 0 if the account cannot roam.
- **accessControlProfileID - integer**: Access Control Profile ID
- **startAddress - string**: Employee's starting address on routes
- **startCity - string**: Employee's starting city on routes
- **startState - string**: Employee's starting state on routes
- **startZip - string**: Employee's starting zip on routes
- **startLat - number**: Employee's starting lat on routes
- **startLng - number**: Employee's starting lng on routes
- **endAddress - string**: Employee's ending address on routes
- **endCity - string**: Employee's ending city on routes
- **endState - string**: Employee's ending state on routes
- **endZip - string**: Employee's ending zip on routes
- **endLat - number**: Employee's ending lat on routes
- **endLng - number**: Employee's ending lng on routes
- **dateUpdated - string**: Employee dateUpdated

---

## /employee/create

<a name="documentation_employeeCreate"></a>

**Description:** Create a new employee.

### Parameters

- **type - integer**: 0: office staff, 1: technician, 2: salesman
- **fname - string - required**: Employee first name.
- **lname - string - required**: Employee last name.
- **phone - string**: Employee phone.
- **email - string**: Employee email.
- **username - string**: Login username, required for a roaming rep.
- **password - string**: Login password, required for a roaming rep.
- **roamingRep - integer**: EmployeeID of the master account. If a non-master account is selected, that account's master rep will be used instead.
- **roamingMaster - integer**: Set as 1 to specify that the user is a roaming master account. This setting will override roamingRep.
- **regionalManagers - array**: Array of officeIDs this employee is a manager of. Replaces existing regionalManager offices.
- **employeeLink - string**: Employee's Link
- **licenseNumber - string**: Employee's License Number
- **accessControlProfileID - integer**: Access Control Profile ID defined in preferences. 0 represents a custom profile.
- **accessControl - string**: Send as form-data array or as a JSON encoded string
- **active - integer**: Send as 0 to set the employee as inactive, send as 1 to set the employee to active. Default state is active.
- **primaryTeam - integer**: Set the primary team for the employee. If the employee is not on this team it will be placed on that team during this operation.
- **supervisorID - integer**: employeeID of the supervisor for this employee.
- **experience - integer**: Integer (max 2 digits)
- **startAddress - string**: Employee's starting address on routes
- **startCity - string**: Employee's starting city on routes
- **startState - string**: Employee's starting state on routes
- **startZip - string**: Employee's starting zip on routes
- **endAddress - string**: Employee's ending address on routes
- **endCity - string**: Employee's ending city on routes
- **endState - string**: Employee's ending state on routes
- **endZip - string**: Employee's ending zip on routes
- **employeeSkills - integer**: Array of skillIDs
- **pic - string**: base64encoded image

---

## /employee/dealias

<a name="documentation_employeeDealias"></a>

**Description:** Find the employeeIDs associated with this employeeID or link

### Parameters

- **employeeID - integer**: Primary key of the employee
- **employeeLink - integer**: External key of the employee
- **active - integer**: active property of the employee 0: inactive 1: active
- **useBothKeys - integer**: Send as 1 to join on both roamingRep and employeeLink relationship

---

## /employee/get

<a name="documentation_employeeGetBulk"></a>

**Description:** Get Bulk data for employee. Accepts an array of employeeIDs. Returns a max of 1000 records.

### Parameters

- **employeeIDs - array**
- **includeCommissionData - int**: Send as 1 to retrieve additional commission data for the employee.

### Response

- **employeeID - integer**: Unique Identifier
- **officeID - integer**: Office ID this employee belongs to
- **active - integer**: 0: Inactive account, 1: Active account
- **fname - string**: Employee's first name
- **lname - string**: Employee's last name
- **initials - string**: Employee's name initials -- user defined in case of duplicate's
- **nickname - string**: Employee's nickname
- **type - integer**: Employee type. 0: Office Staff, 1: Technician, 2: Sales Rep
- **phone - string**: Phone number
- **email - integer**: Unique Identifier
- **username - string**: Employees username
- **experience - integer**: Years of experience of the rep -- mostly to distinguish rookies from veterans
- **skillIDs - integer**: IDs of skills associated with the technician
- **skillDescriptions - integer**: Descriptions of skills associated with the technician
- **pic - string**: URL of the employee image
- **linkedEmployeeIDs - integer**: The master account if this employee is linked to other accounts in other offices. For reporting purposes their stats are typically combined.
- **employeeLink - string**: Employee's Link
- **licenseNumber - string**: License Number
- **supervisorID - integer**: EmployeeID of supervisor
- **roamingRep - integer**: The master employeeID if this employee is linked to other accounts in other offices. Set as 0 if the account cannot roam.
- **regionalManagerOfficeIDs - integer**: List of officeIDs this employee is a regional manager of
- **lastLogin - string**: date of last login
- **teamIDs - integer**: The master employeeID if this employee is linked to other accounts in other offices. Set as 0 if the account cannot roam.
- **primaryTeam - integer**: The master employeeID if this employee is linked to other accounts in other offices. Set as 0 if the account cannot roam.
- **accessControlProfileID - integer**: Access Control Profile ID
- **startAddress - string**: Employee's starting address on routes
- **startCity - string**: Employee's starting city on routes
- **startState - string**: Employee's starting state on routes
- **startZip - string**: Employee's starting zip on routes
- **startLat - number**: Employee's starting lat on routes
- **startLng - number**: Employee's starting lng on routes
- **endAddress - string**: Employee's ending address on routes
- **endCity - string**: Employee's ending city on routes
- **endState - string**: Employee's ending state on routes
- **endZip - string**: Employee's ending zip on routes
- **endLat - number**: Employee's ending lat on routes
- **endLng - number**: Employee's ending lng on routes
- **dateUpdated - string**: Employee dateUpdated

---

## /employee/reset

<a name="documentation_employeeReset"></a>

**Description:** Send a reset password email given an employeeID or username. Password can be set to a specific value through employee/update endpoint

### Parameters

- **employeeID - integer**: EmployeeID
- **username - string**: login username
- **sendEmail - integer**: Send recovery email, default behaviour if not send flags are included.
- **sendSMS - integer**: Send recovery sms

---

## /employee/search

<a name="documentation_employeeSearch"></a>

**Description:** Provide a set of parameters which will return a list of ids. There is no limit to the number of IDs this will return. You can then supply these ids to the `get` endpoint in order to retrieve bulk data. Every parameter available supports a simple value OR a powerful query object that gives you access to all basic comparators. 

Example: dateAdded={"operator":">","value":"2016-01-01"}

Example: dateAdded={"operator\":\"BETWEEN\",\"value\":[\"2016-05-12\",\"2016-05-13\"]}

Available operators: >, <, >=, <=, =, !=, IN, BETWEEN, LIKE, STARTSWITH, ENDSWITH, CONTAINS.

Each of the search endpoints allows for an optional parameter 'includeData'. When sent, the API will additionally send the resolved objects for the first 1000 IDs. Keep in mind when using 'includeData' that if there are more than 1000 items an additional property '{entity}IDsNoDataExported' will specify the items that are not included in the resolved data array.

### Parameters

- **officeIDs - integer**
- **active - integer**: 'Active': 1 or 'Inactive': 0
- **employeeIDs - integer**: Unique Identifier
- **employeeID - integer**: Unique Identifier
- **yearsExperience - integer**: How many years this employee has in experience. Typically used for sales reps to distinguish between rookies and seasoned.
- **lname - string**: Employee's last name
- **fname - string**: Employee's first name
- **type - integer**: Employee type. 0: Office Staff, 1: Technician, 2: Sales Rep
- **employeeLink - string**: Employee's Link
- **roamingRep - integer**: EmployeeID of the master account if this account has access to multiple offices.
- **teamID - integer**: teamID of the employee
- **primaryTeam - integer**: primary teamID of the employee
- **phone - string**: phone number
- **email - string**: email
- **accessControlProfileID - integer**: Access Control Profile ID
- **dateUpdated - string**: Date employee was last updated
- **includeData - integer**: {0,1} Sends the resolved objects for the first 1000 IDs. If there are more than 1000 items an additional property employeeIDsNoDataExported will specify the items that are not included in the resolved employee array.

### Response

- **employeeIDs - array**

---

## /employee/update

<a name="documentation_employeeUpdate"></a>

**Description:** Update an employee.

### Parameters

- **type - integer**: 0: office staff, 1: technician, 2: salesman
- **fname - string**: Employee first name.
- **lname - string**: Employee last name.
- **phone - string**: Employee phone.
- **email - string**: Employee email.
- **username - string**: Login username, required for a roaming rep.
- **password - string**: Login password, required for a roaming rep.
- **roamingRep - integer**: EmployeeID of the master account. If a non-master account is selected, that account's master rep will be used instead.
- **roamingMaster - integer**: Set as 1 to specify that the user is a roaming master account. This setting will override roamingRep.
- **regionalManagers - array**: Array of officeIDs this employee is a manager of. Replaces existing regionalManager offices.
- **employeeLink - string**: Employee's Link
- **licenseNumber - string**: Employee's License Number
- **accessControlProfileID - integer**: Access Control Profile ID defined in preferences. 0 represents a custom profile.
- **accessControl - string**: Send as form-data array or as a JSON encoded string
- **active - integer**: Send as 0 to set the employee as inactive, send as 1 to set the employee to active. Default state is active.
- **primaryTeam - integer**: Set the primary team for the employee. If the employee is not on this team it will be placed on that team during this operation.
- **supervisorID - integer**: employeeID of the supervisor for this employee.
- **experience - integer**: Integer (max 2 digits)
- **startAddress - string**: Employee's starting address on routes
- **startCity - string**: Employee's starting city on routes
- **startState - string**: Employee's starting state on routes
- **startZip - string**: Employee's starting zip on routes
- **endAddress - string**: Employee's ending address on routes
- **endCity - string**: Employee's ending city on routes
- **endState - string**: Employee's ending state on routes
- **endZip - string**: Employee's ending zip on routes
- **employeeSkills - integer**: Array of skillIDs
- **pic - string**: base64encoded image
- **employeeID - integer - required**: Primary key to the employee table.
- **removeVisualGrouping - integer**: Send as 1 to remove visual grouping assignments for the employee.

---

## /employeeLocation/[id]

<a name="documentation_employeeLocationGetID"></a>

**Description:** Get employeeLocation data for single ID -- please provide a specific record ID in the URL structure.

### Parameters

- **-**

### Response

- **locationID - integer**: Primary key.
- **employeeID - integer**: EmployeeID the location is assigned to
- **officeID - integer**
- **time - integer**: time the location check-in took place
- **latitude - number**: latitude of the check-in
- **longitude - number**: longitude of the check-in

---

## /employeeLocation/get

<a name="documentation_employeeLocationGetBulk"></a>

**Description:** Get Bulk data for employeeLocation. Accepts an array of locationIDs. Returns a max of 1000 records.

### Parameters

- **locationIDs - array**

### Response

- **locationID - integer**: Primary key.
- **employeeID - integer**: EmployeeID the location is assigned to
- **officeID - integer**
- **time - integer**: time the location check-in took place
- **latitude - number**: latitude of the check-in
- **longitude - number**: longitude of the check-in

---

## /employeeLocation/search

<a name="documentation_employeeLocationSearch"></a>

**Description:** Provide a set of parameters which will return a list of ids. There is no limit to the number of IDs this will return. You can then supply these ids to the `get` endpoint in order to retrieve bulk data. Every parameter available supports a simple value OR a powerful query object that gives you access to all basic comparators. 

Example: dateAdded={"operator":">","value":"2016-01-01"}

Example: dateAdded={"operator\":\"BETWEEN\",\"value\":[\"2016-05-12\",\"2016-05-13\"]}

Available operators: >, <, >=, <=, =, !=, IN, BETWEEN, LIKE, STARTSWITH, ENDSWITH, CONTAINS.

Each of the search endpoints allows for an optional parameter 'includeData'. When sent, the API will additionally send the resolved objects for the first 1000 IDs. Keep in mind when using 'includeData' that if there are more than 1000 items an additional property '{entity}IDsNoDataExported' will specify the items that are not included in the resolved data array.

### Parameters

- **locationIDs - integer**: Primary key.
- **employeeID - integer**: EmployeeID the location is assigned to
- **officeID - integer**
- **time - integer**: time the location check-in took place
- **includeData - integer**: {0,1} Sends the resolved objects for the first 1000 IDs. If there are more than 1000 items an additional property employeeLocationIDsNoDataExported will specify the items that are not included in the resolved employeeLocation array.

### Response

- **employeeLocationIDs - array**

---

## /form/[id]

<a name="documentation_formGetID"></a>

**Description:** Get form data for single ID -- please provide a specific record ID in the URL structure.

### Parameters

- **includeDocumentLink - integer**: Send as 1 to retrieve a link to the document on AWS with a 15 day TTL.

### Response

- **formID - integer**
- **customerID - integer**
- **dateSigned - string**: The date the form was signed.
- **dateAdded - string**: The date the form was added.
- **unitID - integer**: The unitID associated with the form.
- **employeeID - integer**: The employeeID who created the form.
- **documentState - integer**: State of the document e.g. WIP, COMPLETED
- **formTemplateID - integer**: ID of the template this form was created from
- **formDescription - string**: String description of the template the form was created from.

---

## /form/get

<a name="documentation_formGetBulk"></a>

**Description:** Get Bulk data for form. Accepts an array of contractIDs. Returns a max of 1000 records.

### Parameters

- **contractIDs - array**
- **includeDocumentLink - int**: Send as 1 to retrieve a link to the document on AWS with a 15 day TTL.

### Response

- **formID - integer**
- **customerID - integer**
- **dateSigned - string**: The date the form was signed.
- **dateAdded - string**: The date the form was added.
- **unitID - integer**: The unitID associated with the form.
- **employeeID - integer**: The employeeID who created the form.
- **documentState - integer**: State of the document e.g. WIP, COMPLETED
- **formTemplateID - integer**: ID of the template this form was created from
- **formDescription - string**: String description of the template the form was created from.

---

## /form/search

<a name="documentation_formSearch"></a>

**Description:** Provide a set of parameters which will return a list of ids. There is no limit to the number of IDs this will return. You can then supply these ids to the `get` endpoint in order to retrieve bulk data. Every parameter available supports a simple value OR a powerful query object that gives you access to all basic comparators. 

Example: dateAdded={"operator":">","value":"2016-01-01"}

Example: dateAdded={"operator\":\"BETWEEN\",\"value\":[\"2016-05-12\",\"2016-05-13\"]}

Available operators: >, <, >=, <=, =, !=, IN, BETWEEN, LIKE, STARTSWITH, ENDSWITH, CONTAINS.

Each of the search endpoints allows for an optional parameter 'includeData'. When sent, the API will additionally send the resolved objects for the first 1000 IDs. Keep in mind when using 'includeData' that if there are more than 1000 items an additional property '{entity}IDsNoDataExported' will specify the items that are not included in the resolved data array.

### Parameters

- **formIDs - integer**
- **officeIDs - integer**
- **customerID - integer**
- **dateSigned - string**: The date the form was signed.
- **dateAdded - string**: The date the form was added.
- **unitID - integer**: The unitID associated with the form.
- **employeeID - integer**: The employeeID who created the form.
- **documentState - integer**: State of the document e.g. WIP, COMPLETED
- **formTemplateID - integer**: ID of the template this form was created from
- **includeData - integer**: {0,1} Sends the resolved objects for the first 1000 IDs. If there are more than 1000 items an additional property formIDsNoDataExported will specify the items that are not included in the resolved form array.

### Response

- **formIDs - array**

---

## /genericFlag/[id]

<a name="documentation_genericFlagGetID"></a>

**Description:** Get genericFlag data for single ID -- please provide a specific record ID in the URL structure.

### Parameters

- **-**

### Response

- **genericFlagID - integer**: Unique Identifier
- **officeIDs - integer**: Alias for officeID.
- **officeID - integer**
- **code - string**
- **description - string**
- **status - integer**
- **type - string**
- **dateCreated - string**
- **dateUpdated - string**

---

## /genericFlag/get

<a name="documentation_genericFlagGetBulk"></a>

**Description:** Get Bulk data for genericFlag. Accepts an array of genericFlagIDs. Returns a max of 1000 records.

### Parameters

- **genericFlagIDs - array**

### Response

- **genericFlagID - integer**: Unique Identifier
- **officeIDs - integer**: Alias for officeID.
- **officeID - integer**
- **code - string**
- **description - string**
- **status - integer**
- **type - string**
- **dateCreated - string**
- **dateUpdated - string**

---

## /genericFlag/search

<a name="documentation_genericFlagSearch"></a>

**Description:** Provide a set of parameters which will return a list of ids. There is no limit to the number of IDs this will return. You can then supply these ids to the `get` endpoint in order to retrieve bulk data. Every parameter available supports a simple value OR a powerful query object that gives you access to all basic comparators. 

Example: dateAdded={"operator":">","value":"2016-01-01"}

Example: dateAdded={"operator\":\"BETWEEN\",\"value\":[\"2016-05-12\",\"2016-05-13\"]}

Available operators: >, <, >=, <=, =, !=, IN, BETWEEN, LIKE, STARTSWITH, ENDSWITH, CONTAINS.

Each of the search endpoints allows for an optional parameter 'includeData'. When sent, the API will additionally send the resolved objects for the first 1000 IDs. Keep in mind when using 'includeData' that if there are more than 1000 items an additional property '{entity}IDsNoDataExported' will specify the items that are not included in the resolved data array.

### Parameters

- **genericFlagIDs - integer**
- **officeIDs - integer**
- **code - string**
- **description - string**
- **status - integer**
- **type - string**
- **dateCreated - string**
- **dateUpdated - string**
- **includeData - integer**: {0,1} Sends the resolved objects for the first 1000 IDs. If there are more than 1000 items an additional property genericFlagIDsNoDataExported will specify the items that are not included in the resolved genericFlag array.

### Response

- **genericFlagIDs - array**

---

## /genericFlagAssignment/[id]

<a name="documentation_genericFlagAssignmentGetID"></a>

**Description:** Get genericFlagAssignment data for single ID -- please provide a specific record ID in the URL structure.

### Parameters

- **-**

### Response

- **genericFlagAssignmentID - integer**: Unique Identifier
- **genericFlagID - integer**
- **entityID - integer**: CUST, EQAS, SUBS, or APPT ID
- **type - string**: Type of flag assignment
- **dateCreated - string**: Date generic flag assignment was created
- **dateUpdated - string**: Date generic flag assignment was last updated

---

## /genericFlagAssignment/create

<a name="documentation_genericFlagAssignmentCreate"></a>

### Parameters

- **genericFlagID - integer - required**: Foreign key to flag
- **entityID - integer - required**: ID of entity being assigned the flag
- **type - string - required**: Type of flag.

---

## /genericFlagAssignment/delete

<a name="documentation_genericFlagAssignmentDelete"></a>

### Parameters

- **genericFlagAssignmentID - integer - required**

---

## /genericFlagAssignment/get

<a name="documentation_genericFlagAssignmentGetBulk"></a>

**Description:** Get Bulk data for genericFlagAssignment. Accepts an array of genericFlagAssignmentIDs. Returns a max of 1000 records.

### Parameters

- **genericFlagAssignmentIDs - array**

### Response

- **genericFlagAssignmentID - integer**: Unique Identifier
- **genericFlagID - integer**
- **entityID - integer**: CUST, EQAS, SUBS, or APPT ID
- **type - string**: Type of flag assignment
- **dateCreated - string**: Date generic flag assignment was created
- **dateUpdated - string**: Date generic flag assignment was last updated

---

## /genericFlagAssignment/search

<a name="documentation_genericFlagAssignmentSearch"></a>

**Description:** Provide a set of parameters which will return a list of ids. There is no limit to the number of IDs this will return. You can then supply these ids to the `get` endpoint in order to retrieve bulk data. Every parameter available supports a simple value OR a powerful query object that gives you access to all basic comparators. 

Example: dateAdded={"operator":">","value":"2016-01-01"}

Example: dateAdded={"operator\":\"BETWEEN\",\"value\":[\"2016-05-12\",\"2016-05-13\"]}

Available operators: >, <, >=, <=, =, !=, IN, BETWEEN, LIKE, STARTSWITH, ENDSWITH, CONTAINS.

Each of the search endpoints allows for an optional parameter 'includeData'. When sent, the API will additionally send the resolved objects for the first 1000 IDs. Keep in mind when using 'includeData' that if there are more than 1000 items an additional property '{entity}IDsNoDataExported' will specify the items that are not included in the resolved data array.

### Parameters

- **genericFlagAssignmentIDs - integer**
- **genericFlagIDs - integer**
- **entityIDs - integer**
- **type - string**
- **officeIDs - integer**
- **officeID - integer**
- **dateCreated - string**
- **dateUpdated - string**
- **includeData - integer**: {0,1} Sends the resolved objects for the first 1000 IDs. If there are more than 1000 items an additional property genericFlagAssignmentIDsNoDataExported will specify the items that are not included in the resolved genericFlagAssignment array.

### Response

- **genericFlagAssignmentIDs - array**

---

## /genericFlagAssignment/update

<a name="documentation_genericFlagAssignmentUpdate"></a>

### Parameters

- **genericFlagAssignmentID - integer - required**: ID of genericFlagAssignment being updated
- **genericFlagID - integer - required**: Foreign key to flag

---

## /glAccount/[id]

<a name="documentation_glAccountGetID"></a>

**Description:** Get glAccount data for single ID -- please provide a specific record ID in the URL structure.

### Parameters

- **-**

### Response

- **glAccountID - integer**
- **glNumber - integer**
- **officeID - integer**
- **title - string**
- **description - string**
- **visible - integer**

---

## /glAccount/get

<a name="documentation_glAccountGetBulk"></a>

**Description:** Get Bulk data for glAccount. Accepts an array of glAccountIDs. Returns a max of 1000 records.

### Parameters

- **glAccountIDs - array**

### Response

- **glAccountID - integer**
- **glNumber - integer**
- **officeID - integer**
- **title - string**
- **description - string**
- **visible - integer**

---

## /glAccount/search

<a name="documentation_glAccountSearch"></a>

**Description:** Provide a set of parameters which will return a list of ids. There is no limit to the number of IDs this will return. You can then supply these ids to the `get` endpoint in order to retrieve bulk data. Every parameter available supports a simple value OR a powerful query object that gives you access to all basic comparators. 

Example: dateAdded={"operator":">","value":"2016-01-01"}

Example: dateAdded={"operator\":\"BETWEEN\",\"value\":[\"2016-05-12\",\"2016-05-13\"]}

Available operators: >, <, >=, <=, =, !=, IN, BETWEEN, LIKE, STARTSWITH, ENDSWITH, CONTAINS.

Each of the search endpoints allows for an optional parameter 'includeData'. When sent, the API will additionally send the resolved objects for the first 1000 IDs. Keep in mind when using 'includeData' that if there are more than 1000 items an additional property '{entity}IDsNoDataExported' will specify the items that are not included in the resolved data array.

### Parameters

- **glAccountIDs - integer**
- **glAccountID - integer**
- **glNumber - integer**
- **officeIDs - integer**
- **includeData - integer**: {0,1} Sends the resolved objects for the first 1000 IDs. If there are more than 1000 items an additional property glAccountIDsNoDataExported will specify the items that are not included in the resolved glAccount array.

### Response

- **glAccountIDs - array**

---

## /group/[id]

<a name="documentation_groupGetID"></a>

**Description:** Get group data for single ID -- please provide a specific record ID in the URL structure.

### Parameters

- **-**

### Response

- **groupID - integer**
- **templateID - integer**
- **dateUpdated - string**

---

## /group/create

<a name="documentation_groupCreate"></a>

**Description:** create a group

### Parameters

- **date - string**: Date to create for
- **templateID - integer**: templateID from office software
- **title - string**: Title string (30 character limit)

---

## /group/get

<a name="documentation_groupGetBulk"></a>

**Description:** Get Bulk data for group. Accepts an array of groupIDs. Returns a max of 1000 records.

### Parameters

- **groupIDs - array**

### Response

- **groupID - integer**
- **templateID - integer**
- **dateUpdated - string**

---

## /group/search

<a name="documentation_groupSearch"></a>

**Description:** Provide a set of parameters which will return a list of ids. There is no limit to the number of IDs this will return. You can then supply these ids to the `get` endpoint in order to retrieve bulk data. Every parameter available supports a simple value OR a powerful query object that gives you access to all basic comparators. 

Example: dateAdded={"operator":">","value":"2016-01-01"}

Example: dateAdded={"operator\":\"BETWEEN\",\"value\":[\"2016-05-12\",\"2016-05-13\"]}

Available operators: >, <, >=, <=, =, !=, IN, BETWEEN, LIKE, STARTSWITH, ENDSWITH, CONTAINS.

Each of the search endpoints allows for an optional parameter 'includeData'. When sent, the API will additionally send the resolved objects for the first 1000 IDs. Keep in mind when using 'includeData' that if there are more than 1000 items an additional property '{entity}IDsNoDataExported' will specify the items that are not included in the resolved data array.

### Parameters

- **groupIDs - integer**: Primary key
- **groupID - integer**: Primary key alias
- **officeIDs - integer**: Office ID region belongs to
- **date - string**: Date the group was last updated
- **dateUpdated - string**: Date the group was last updated
- **includeData - integer**: {0,1} Sends the resolved objects for the first 1000 IDs. If there are more than 1000 items an additional property groupIDsNoDataExported will specify the items that are not included in the resolved group array.

### Response

- **groupIDs - array**

---

## /group/update

<a name="documentation_groupUpdate"></a>

**Description:** Update group details

### Parameters

- **title - string**: Title string (30 character limit)
- **groupID - integer - required**: Primary key to the group table.

---

## /insect/[id]

<a name="documentation_insectGetID"></a>

**Description:** Get insect data for single ID -- please provide a specific record ID in the URL structure.

### Parameters

- **-**

### Response

- **insectID - integer**
- **officeID - integer**
- **name - string**
- **family - string**
- **threat - string**
- **fact - string**
- **about1 - string**
- **about2 - string**
- **aboutBlurb - string**
- **funFacts - string**
- **factBlurb - string**
- **image - string**
- **visible - integer**
- **system - integer**

---

## /insect/get

<a name="documentation_insectGetBulk"></a>

**Description:** Get Bulk data for insect. Accepts an array of insectIDs. Returns a max of 1000 records.

### Parameters

- **insectIDs - array**

### Response

- **insectID - integer**
- **officeID - integer**
- **name - string**
- **family - string**
- **threat - string**
- **fact - string**
- **about1 - string**
- **about2 - string**
- **aboutBlurb - string**
- **funFacts - string**
- **factBlurb - string**
- **image - string**
- **visible - integer**
- **system - integer**

---

## /insect/search

<a name="documentation_insectSearch"></a>

**Description:** Provide a set of parameters which will return a list of ids. There is no limit to the number of IDs this will return. You can then supply these ids to the `get` endpoint in order to retrieve bulk data. Every parameter available supports a simple value OR a powerful query object that gives you access to all basic comparators. 

Example: dateAdded={"operator":">","value":"2016-01-01"}

Example: dateAdded={"operator\":\"BETWEEN\",\"value\":[\"2016-05-12\",\"2016-05-13\"]}

Available operators: >, <, >=, <=, =, !=, IN, BETWEEN, LIKE, STARTSWITH, ENDSWITH, CONTAINS.

Each of the search endpoints allows for an optional parameter 'includeData'. When sent, the API will additionally send the resolved objects for the first 1000 IDs. Keep in mind when using 'includeData' that if there are more than 1000 items an additional property '{entity}IDsNoDataExported' will specify the items that are not included in the resolved data array.

### Parameters

- **insectIDs - integer**: Primary key
- **insectID - integer**: Primary key alias
- **officeIDs - integer**: OfficeID insect belongs to
- **visible - integer**: 1 if insect is visible, 0 otherwise
- **includeData - integer**: {0,1} Sends the resolved objects for the first 1000 IDs. If there are more than 1000 items an additional property insectIDsNoDataExported will specify the items that are not included in the resolved insect array.

### Response

- **insectIDs - array**

---

## /knock/[id]

<a name="documentation_knockGetID"></a>

**Description:** Get knock data for single ID -- please provide a specific record ID in the URL structure.

### Parameters

- **-**

### Response

- **knockID - integer**: Primary Key
- **type - integer**: 0 - competitor, 1 - objection
- **doorID - integer**
- **serviceID - integer**
- **employeeID - integer**
- **dateAdded - string**
- **dateUpdated - string**

---

## /knock/get

<a name="documentation_knockGetBulk"></a>

**Description:** Get Bulk data for knock. Accepts an array of knockIDs. Returns a max of 1000 records.

### Parameters

- **knockIDs - array**

### Response

- **knockID - integer**: Primary Key
- **type - integer**: 0 - competitor, 1 - objection
- **doorID - integer**
- **serviceID - integer**
- **employeeID - integer**
- **dateAdded - string**
- **dateUpdated - string**

---

## /knock/search

<a name="documentation_knockSearch"></a>

**Description:** Provide a set of parameters which will return a list of ids. There is no limit to the number of IDs this will return. You can then supply these ids to the `get` endpoint in order to retrieve bulk data. Every parameter available supports a simple value OR a powerful query object that gives you access to all basic comparators. 

Example: dateAdded={"operator":">","value":"2016-01-01"}

Example: dateAdded={"operator\":\"BETWEEN\",\"value\":[\"2016-05-12\",\"2016-05-13\"]}

Available operators: >, <, >=, <=, =, !=, IN, BETWEEN, LIKE, STARTSWITH, ENDSWITH, CONTAINS.

Each of the search endpoints allows for an optional parameter 'includeData'. When sent, the API will additionally send the resolved objects for the first 1000 IDs. Keep in mind when using 'includeData' that if there are more than 1000 items an additional property '{entity}IDsNoDataExported' will specify the items that are not included in the resolved data array.

### Parameters

- **knockID - integer**: Primary Key
- **doorID - integer**: Door the knock is associated with
- **dateAdded - string**: Date the knock was created
- **dateUpdated - string**: Date the knock was last updated
- **includeData - integer**: {0,1} Sends the resolved objects for the first 1000 IDs. If there are more than 1000 items an additional property knockIDsNoDataExported will specify the items that are not included in the resolved knock array.

### Response

- **knockIDs - array**

---

## /location/[id]

<a name="documentation_locationGetID"></a>

**Description:** Get location data for single ID -- please provide a specific record ID in the URL structure.

### Parameters

- **-**

### Response

- **locationID - integer**
- **officeID - integer**
- **name - string**
- **visible - integer**
- **system - integer**

---

## /location/get

<a name="documentation_locationGetBulk"></a>

**Description:** Get Bulk data for location. Accepts an array of locationIDs. Returns a max of 1000 records.

### Parameters

- **locationIDs - array**

### Response

- **locationID - integer**
- **officeID - integer**
- **name - string**
- **visible - integer**
- **system - integer**

---

## /location/search

<a name="documentation_locationSearch"></a>

**Description:** Provide a set of parameters which will return a list of ids. There is no limit to the number of IDs this will return. You can then supply these ids to the `get` endpoint in order to retrieve bulk data. Every parameter available supports a simple value OR a powerful query object that gives you access to all basic comparators. 

Example: dateAdded={"operator":">","value":"2016-01-01"}

Example: dateAdded={"operator\":\"BETWEEN\",\"value\":[\"2016-05-12\",\"2016-05-13\"]}

Available operators: >, <, >=, <=, =, !=, IN, BETWEEN, LIKE, STARTSWITH, ENDSWITH, CONTAINS.

Each of the search endpoints allows for an optional parameter 'includeData'. When sent, the API will additionally send the resolved objects for the first 1000 IDs. Keep in mind when using 'includeData' that if there are more than 1000 items an additional property '{entity}IDsNoDataExported' will specify the items that are not included in the resolved data array.

### Parameters

- **locationIDs - integer**: Primary key
- **locationID - integer**: Primary key alias
- **officeIDs - integer**: OfficeID insect belongs to
- **visible - integer**: visibility of the location
- **includeData - integer**: {0,1} Sends the resolved objects for the first 1000 IDs. If there are more than 1000 items an additional property locationIDsNoDataExported will specify the items that are not included in the resolved location array.

### Response

- **locationIDs - array**

---

## /note/[id]

<a name="documentation_noteGetID"></a>

**Description:** Get note data for single ID -- please provide a specific record ID in the URL structure.

### Parameters

- **-**

### Response

- **noteID - integer**: Unique Identifier
- **officeIDs - integer**
- **customerID - integer**: Customer ID
- **customerName - string**: Customer Name
- **customerSpouse - string**: Spouse Field
- **companyName - string**: Company Name
- **employeeID - integer**: Employee ID that created the note
- **employeeName - string**: Employee name that created the note
- **date - string**: Date note was created
- **showCustomer - integer**: Whether or not this shows up on the invoices or customer portal so the customer can see it
- **showTech - integer**: Whether or not this shows up in the tech app
- **cancellationReasonID - integer**: If this is part of a cancellation, the ID cancellation reason selected
- **cancellationReason - string**: If this is part of a cancellation, the description of the cancellation reason selected
- **typeID - integer**: The ID for the contact type
- **type - integer**: Description of note type
- **contactTypeCategories - integer**: Categories associated with the note type
- **notes - string**: The actual note content
- **referenceID - integer**: If this is in regards to a subscription cancellation, the subscription ID. Can also be a re-instatement subscription ID, etc... depending on the note type
- **dateAdded - string**: Date this note was created
- **dateUpdated - string**: Date the note was last updated.

---

## /note/create

<a name="documentation_noteCreate"></a>

### Parameters

- **customerID - integer - required**: Foreign key to customers table.
- **date - string - required**: Date of the note (mutable)
- **employeeID - integer**: Foreign key to employees table.
- **contactType - integer - required**: Foreign key to contactTypes table found via Admin > Preferences > Note Types
- **notes - string - required**: Arbitrary comment string
- **sendTo - string**: System field?
- **showOnInvoice - boolean - required**: 1 to display this note on invoices, 0 to hide
- **cancellationReason - integer**: Foreign key to cancellationReasons table found via Admin > Preferences > Cancellation Reasons
- **showTech - boolean**: Note will be displayed to Tech on the mobile app
- **showCustomer - boolean**: Note will be displayed to the customer in some service notifications
- **referenceID - integer**: Subscription ID this note relates to.

---

## /note/delete

<a name="documentation_noteDelete"></a>

### Parameters

- **customerID - integer - required**: Foreign key to customers table.
- **contactID - integer - required**: Foreign key to customerContacts table.

---

## /note/get

<a name="documentation_noteGetBulk"></a>

**Description:** Get Bulk data for note. Accepts an array of noteIDs. Returns a max of 1000 records.

### Parameters

- **noteIDs - array**

### Response

- **noteID - integer**: Unique Identifier
- **officeIDs - integer**
- **customerID - integer**: Customer ID
- **customerName - string**: Customer Name
- **customerSpouse - string**: Spouse Field
- **companyName - string**: Company Name
- **employeeID - integer**: Employee ID that created the note
- **employeeName - string**: Employee name that created the note
- **date - string**: Date note was created
- **showCustomer - integer**: Whether or not this shows up on the invoices or customer portal so the customer can see it
- **showTech - integer**: Whether or not this shows up in the tech app
- **cancellationReasonID - integer**: If this is part of a cancellation, the ID cancellation reason selected
- **cancellationReason - string**: If this is part of a cancellation, the description of the cancellation reason selected
- **typeID - integer**: The ID for the contact type
- **type - integer**: Description of note type
- **contactTypeCategories - integer**: Categories associated with the note type
- **notes - string**: The actual note content
- **referenceID - integer**: If this is in regards to a subscription cancellation, the subscription ID. Can also be a re-instatement subscription ID, etc... depending on the note type
- **dateAdded - string**: Date this note was created
- **dateUpdated - string**: Date the note was last updated.

---

## /note/search

<a name="documentation_noteSearch"></a>

**Description:** Provide a set of parameters which will return a list of ids. There is no limit to the number of IDs this will return. You can then supply these ids to the `get` endpoint in order to retrieve bulk data. Every parameter available supports a simple value OR a powerful query object that gives you access to all basic comparators. 

Example: dateAdded={"operator":">","value":"2016-01-01"}

Example: dateAdded={"operator\":\"BETWEEN\",\"value\":[\"2016-05-12\",\"2016-05-13\"]}

Available operators: >, <, >=, <=, =, !=, IN, BETWEEN, LIKE, STARTSWITH, ENDSWITH, CONTAINS.

Each of the search endpoints allows for an optional parameter 'includeData'. When sent, the API will additionally send the resolved objects for the first 1000 IDs. Keep in mind when using 'includeData' that if there are more than 1000 items an additional property '{entity}IDsNoDataExported' will specify the items that are not included in the resolved data array.

### Parameters

- **noteIDs - integer**
- **officeIDs - integer**
- **customerIDs - integer**
- **date - string**
- **dateAdded - string**
- **typeIDs - integer**
- **employeeIDs - integer**
- **content - string**
- **cancellationReason - integer**
- **referenceID - integer**
- **dateUpdated - string**: Last date this note record was updated.
- **includeData - integer**: {0,1} Sends the resolved objects for the first 1000 IDs. If there are more than 1000 items an additional property noteIDsNoDataExported will specify the items that are not included in the resolved note array.

### Response

- **noteIDs - array**

---

## /note/update

<a name="documentation_noteUpdate"></a>

### Parameters

- **customerID - integer - required**: Foreign key to customers table.
- **date - string - required**: Date of the note (mutable)
- **employeeID - integer**: Foreign key to employees table.
- **contactType - integer - required**: Foreign key to contactTypes table found via Admin > Preferences > Note Types
- **notes - string**: Arbitrary comment string
- **sendTo - string**: System field?
- **showOnInvoice - boolean - required**: 1 to display this note on invoices, 0 to hide
- **cancellationReason - integer**: Foreign key to cancellationReasons table found via Admin > Preferences > Cancellation Reasons
- **showTech - boolean**: Note will be displayed to Tech on the mobile app
- **showCustomer - boolean**: Note will be displayed to the customer in some service notifications
- **referenceID - integer**: Subscription ID this note relates to.
- **contactID - integer - required**: Primary key to the notes table.

---

## /office/[id]

<a name="documentation_officeGetID"></a>

**Description:** Get office data for single ID -- please provide a specific record ID in the URL structure.

### Parameters

- **-**

### Response

- **officeID - integer**: Primary Key
- **officeName - string**: Description of the product
- **companyID - integer**: companyID of the office
- **licenseNumber - integer**: licenseNumber of the office
- **contactNumber - string**: phone number of the office
- **contactEmail - string**: email of the office
- **website - string**: website of the office
- **timeZone - string**: time zone of the office
- **address - string**: physical location of the office
- **city - string**: city of the office
- **state - string**: state of the office
- **zip - string**: zip code of the office
- **invoiceAddress - string**: invoice address of the office
- **invoiceCity - string**: invoice city of the office
- **invoiceState - string**: invoice state of the office
- **invoiceZip - string**: invoice zip code of the office
- **cautionStatements - string**: Admin > Preferences > Customer Preferences > Customer Communication > Service Notification Notes / Caution Statements

---

## /office/get

<a name="documentation_officeGetBulk"></a>

**Description:** Get Bulk data for office. Accepts an array of officeIDs. Returns a max of 1000 records.

### Parameters

- **officeIDs - array**

### Response

- **officeID - integer**: Primary Key
- **officeName - string**: Description of the product
- **companyID - integer**: companyID of the office
- **licenseNumber - integer**: licenseNumber of the office
- **contactNumber - string**: phone number of the office
- **contactEmail - string**: email of the office
- **website - string**: website of the office
- **timeZone - string**: time zone of the office
- **address - string**: physical location of the office
- **city - string**: city of the office
- **state - string**: state of the office
- **zip - string**: zip code of the office
- **invoiceAddress - string**: invoice address of the office
- **invoiceCity - string**: invoice city of the office
- **invoiceState - string**: invoice state of the office
- **invoiceZip - string**: invoice zip code of the office
- **cautionStatements - string**: Admin > Preferences > Customer Preferences > Customer Communication > Service Notification Notes / Caution Statements

---

## /office/search

<a name="documentation_officeSearch"></a>

**Description:** Provide a set of parameters which will return a list of ids. There is no limit to the number of IDs this will return. You can then supply these ids to the `get` endpoint in order to retrieve bulk data. Every parameter available supports a simple value OR a powerful query object that gives you access to all basic comparators. 

Example: dateAdded={"operator":">","value":"2016-01-01"}

Example: dateAdded={"operator\":\"BETWEEN\",\"value\":[\"2016-05-12\",\"2016-05-13\"]}

Available operators: >, <, >=, <=, =, !=, IN, BETWEEN, LIKE, STARTSWITH, ENDSWITH, CONTAINS.

Each of the search endpoints allows for an optional parameter 'includeData'. When sent, the API will additionally send the resolved objects for the first 1000 IDs. Keep in mind when using 'includeData' that if there are more than 1000 items an additional property '{entity}IDsNoDataExported' will specify the items that are not included in the resolved data array.

### Parameters

- **officeID - integer**: Primary Key
- **companyID - integer**: companyID of the office
- **includeData - integer**: {0,1} Sends the resolved objects for the first 1000 IDs. If there are more than 1000 items an additional property officeIDsNoDataExported will specify the items that are not included in the resolved office array.

### Response

- **officeIDs - array**

---

## /payment/[id]

<a name="documentation_paymentGetID"></a>

**Description:** Get payment data for single ID -- please provide a specific record ID in the URL structure.

### Parameters

- **-**

### Response

- **paymentID - integer**: Payment Unique Identifier
- **officeID - integer**: Office Unique Identifier
- **customerID - integer**: Customer Unique Identifier
- **date - string**: Payment date
- **paymentMethod - integer**: Payment Method 0-Coupon, 1-Cash, 2-Check, 3-Credit Card, 4 ACH, 5-Credit Memo
- **amount - number**: Payment amount
- **appliedAmount - number**: Amount of the payment that was used
- **unassignedAmount - number**: Amount of the payment that was not used yet
- **status - integer**: Status of the payment (0-Unsuccessful, 1-Successful, 2-Refunded)
- **invoiceIDs - integer**: Tickets that this payment was applied for
- **paymentApplications - string**: Array of payment applications associated with the ticket
- **employeeID - integer**: EmployeeID who recorded the payment
- **officePayment - integer**: officePayment flag
- **collectionPayment - integer**: collectionPayment flag
- **writeOff - integer**: writeOff flag
- **creditMemo - integer**: 1 if Credit Memo, 0 otherwise
- **paymentOrigin - integer**: 0 = Office Software, 1 = Customer Portal , 2 = Sales App , 3 = Technician App, 4 = ARM (collections)
- **originalPaymentID - integer**: Original paymentID (for refunds)
- **lastFour - string**: Last 4 digits of credit card if applicable
- **notes - string**: Notes from payment processor
- **batchOpened - string**: time payment batch was opened
- **batchClosed - string**: time payment batch was closed
- **paymentSource - string**: possible values: 'API','Batch Process','Collections','Customer Portal','Manual','Trigger','Import'
- **dateUpdated - string**: Date of last update
- **transactionID - integer**: transactionID

---

## /payment/create

<a name="documentation_paymentCreate"></a>

### Parameters

- **doCharge - integer - required**: 1 - payment will be processed via FieldRoutes. 0 - payment is inserted as a completed payment without charging.
- **paymentMethod - integer - required**: Payment Method 0-Coupon, 1-Cash, 2-Check, 3-Credit Card, 4 ACH
- **customerID - integer - required**: customerID to associate the payment with
- **amount - number - required**: Amount this payment was for
- **employeeID - integer**: Employee to associate with the payment
- **notes - integer**: Description for this payment
- **ticketID - integer**: Limit payment to this ticket
- **subscriptionID - integer**: Limit payment to this subscription
- **paymentProfileID - integer**: Limit use specified paymentProfileID for payment (must be owned by customer)
- **status - integer**: Only applies with doCharge=0. Set as 0 to create a failed payment record, 1 to create a success

---

## /payment/createRefund

<a name="documentation_paymentCreateRefund"></a>

### Parameters

- **paymentID - integer - required**: paymentID to refund
- **amount - number**: Amount this payment was for
- **skipProcessing - integer**: Send as 1 to create a payment record without processing the refund

---

## /payment/get

<a name="documentation_paymentGetBulk"></a>

**Description:** Get Bulk data for payment. Accepts an array of paymentIDs. Returns a max of 1000 records.

### Parameters

- **paymentIDs - array**

### Response

- **paymentID - integer**: Payment Unique Identifier
- **officeID - integer**: Office Unique Identifier
- **customerID - integer**: Customer Unique Identifier
- **date - string**: Payment date
- **paymentMethod - integer**: Payment Method 0-Coupon, 1-Cash, 2-Check, 3-Credit Card, 4 ACH, 5-Credit Memo
- **amount - number**: Payment amount
- **appliedAmount - number**: Amount of the payment that was used
- **unassignedAmount - number**: Amount of the payment that was not used yet
- **status - integer**: Status of the payment (0-Unsuccessful, 1-Successful, 2-Refunded)
- **invoiceIDs - integer**: Tickets that this payment was applied for
- **paymentApplications - string**: Array of payment applications associated with the ticket
- **employeeID - integer**: EmployeeID who recorded the payment
- **officePayment - integer**: officePayment flag
- **collectionPayment - integer**: collectionPayment flag
- **writeOff - integer**: writeOff flag
- **creditMemo - integer**: 1 if Credit Memo, 0 otherwise
- **paymentOrigin - integer**: 0 = Office Software, 1 = Customer Portal , 2 = Sales App , 3 = Technician App, 4 = ARM (collections)
- **originalPaymentID - integer**: Original paymentID (for refunds)
- **lastFour - string**: Last 4 digits of credit card if applicable
- **notes - string**: Notes from payment processor
- **batchOpened - string**: time payment batch was opened
- **batchClosed - string**: time payment batch was closed
- **paymentSource - string**: possible values: 'API','Batch Process','Collections','Customer Portal','Manual','Trigger','Import'
- **dateUpdated - string**: Date of last update
- **transactionID - integer**: transactionID

---

## /payment/search

<a name="documentation_paymentSearch"></a>

**Description:** Provide a set of parameters which will return a list of ids. There is no limit to the number of IDs this will return. You can then supply these ids to the `get` endpoint in order to retrieve bulk data. Every parameter available supports a simple value OR a powerful query object that gives you access to all basic comparators. 

Example: dateAdded={"operator":">","value":"2016-01-01"}

Example: dateAdded={"operator\":\"BETWEEN\",\"value\":[\"2016-05-12\",\"2016-05-13\"]}

Available operators: >, <, >=, <=, =, !=, IN, BETWEEN, LIKE, STARTSWITH, ENDSWITH, CONTAINS.

Each of the search endpoints allows for an optional parameter 'includeData'. When sent, the API will additionally send the resolved objects for the first 1000 IDs. Keep in mind when using 'includeData' that if there are more than 1000 items an additional property '{entity}IDsNoDataExported' will specify the items that are not included in the resolved data array.

### Parameters

- **officeIDs - integer**: Office Unique Identifier
- **paymentIDs - integer**: Payment Unique Identifier
- **customerIDs - integer**: Customer Unique Identifier
- **amount - number**: Amount of Payment
- **date - string**: Payment date
- **paymentMethod - integer**: Payment Method 0-Coupon, 1-Cash, 2-Check, 3-Credit Card, 4 ACH
- **status - integer**: Status of the payment (0-Unsuccessful, 1-Successful, 2-Refunded)
- **dateApplied - string**: Date the payment was applied
- **employeeID - integer**: employeeID that recorded the payment
- **originalPaymentID - integer**: Original paymentID (for refunds)
- **dateUpdated - string**: Date the payment was last updated
- **includeData - integer**: {0,1} Sends the resolved objects for the first 1000 IDs. If there are more than 1000 items an additional property paymentIDsNoDataExported will specify the items that are not included in the resolved payment array.

### Response

- **paymentIDs - array**

---

## /paymentProfile/[id]

<a name="documentation_paymentProfileGetID"></a>

**Description:** Get paymentProfile data for single ID -- please provide a specific record ID in the URL structure.

### Parameters

- **-**

### Response

- **paymentProfileID - integer**: Primary key for the paymentProfile
- **customerID - integer**: customer that the paymentProfile belongs to.
- **officeID - integer**: OfficeID of the customer that the paymentProfile belongs to.
- **createdBy - integer**: employeeID who created the paymentProfile
- **description - string**: Payment profile description
- **dateCreated - string**: date the payment profile was created
- **dateUpdated - string**: date the payment profile was last updated
- **status - integer**: -1 = soft deleted, 0 = empty, 1 = valid, 2 = invalid, 3 = expired, 4 = last transaction failed
- **statusNotes - string**
- **billingName - string**: Name associated with the CC/Bank account
- **billingAddress1 - string**: Address associated with the CC/Bank account
- **billingAddress2 - string**
- **billingCountryID - integer**: Country associated with the CC/Bank account
- **billingCity - string**: City associated with the CC/Bank account
- **billingState - string**: State associated with the CC/Bank account
- **billingZip - string**: Zip associated with the CC/Bank account
- **billingPhone - string**: Phone associated with the CC/Bank account
- **billingEmail - string**: email associated with the CC/Bank account
- **paymentMethod - integer**: 1=cc, 2 = ach
- **gateway - string**: ACH or CC gateway E.G. authorize, nmi, brain, element
- **merchantID - string**: Credit card only
- **merchantToken - string**: Credit card only
- **lastFour - string**: Credit card only last four digits of the card
- **expMonth - string**: Credit card only - Expiration month
- **expYear - string**: Credit card only - Expiration year
- **cardType - string**: Credit card only e.g. Visa, Mastercard
- **bankName - string**: ACH only
- **accountNumber - string**: ACH only - masked account number
- **routingNumber - string**: ACH only - routing number
- **checkType - integer**: ACH only - 0=checking, 1=savings
- **accountType - integer**: ACH only -  0=personal, 1=business
- **failedAttempts - integer**
- **sentFailureDate - string**
- **lastAttemptDate - string**
- **paymentHoldDate - string**
- **retryPoints - integer**
- **initialTransactionID - string**
- **lastDeclineType - string**

---

## /paymentProfile/create

<a name="documentation_paymentProfileCreate"></a>

**Description:** Create a payment profile using a CreditCardToken and CreditCardTokenID from braintree/element. This will become the active payment profile for cc/ach.

### Parameters

- **customerID - integer - required**: Foreign Key to customers table
- **billingName - string**: Billing name associated with payment profile
- **billingAddress1 - string**: Billing address associated with payment profile
- **billingAddress2 - string**: Billing address associated with payment profile
- **billingCity - string**: Billing city associated with payment profile
- **billingState - string**: Billing state associated with payment profile
- **billingZip - integer**: Billing zip code associated with payment profile
- **billingCountryID - string**: Billing country code associated with payment profile
- **paymentMethod - integer - required**: 1=cc, 2 = ach
- **gateway - string**: ACH or CC gateway E.G. authorize, nmi, brain, element, payrix
- **bankName - string**: ACH only
- **accountNumber - string**: ACH only - check account number
- **routingNumber - string**: ACH only - routing number
- **checkType - integer**: ACH only - 0=checking, 1=savings
- **accountType - integer**: ACH only -  0=personal, 1=business
- **merchantID - string**: Required for braintree and element. Not required for nmi
- **merchantToken - string**: Required for braintree and nmi. Not required for element
- **autopay - integer**: Send as 1 to set the owning customer to autopay using this profile
- **paymentHoldDate - string**: Hold date for the payment profile

---

## /paymentProfile/delete

<a name="documentation_paymentProfileDelete"></a>

**Description:** Delete a payment profile.

### Parameters

- **paymentProfileID - integer - required**: Foreign Key to paymentProfile table

---

## /paymentProfile/get

<a name="documentation_paymentProfileGetBulk"></a>

**Description:** Get Bulk data for paymentProfile. Accepts an array of paymentProfileIDs. Returns a max of 1000 records.

### Parameters

- **paymentProfileIDs - array**

### Response

- **paymentProfileID - integer**: Primary key for the paymentProfile
- **customerID - integer**: customer that the paymentProfile belongs to.
- **officeID - integer**: OfficeID of the customer that the paymentProfile belongs to.
- **createdBy - integer**: employeeID who created the paymentProfile
- **description - string**: Payment profile description
- **dateCreated - string**: date the payment profile was created
- **dateUpdated - string**: date the payment profile was last updated
- **status - integer**: -1 = soft deleted, 0 = empty, 1 = valid, 2 = invalid, 3 = expired, 4 = last transaction failed
- **statusNotes - string**
- **billingName - string**: Name associated with the CC/Bank account
- **billingAddress1 - string**: Address associated with the CC/Bank account
- **billingAddress2 - string**
- **billingCountryID - integer**: Country associated with the CC/Bank account
- **billingCity - string**: City associated with the CC/Bank account
- **billingState - string**: State associated with the CC/Bank account
- **billingZip - string**: Zip associated with the CC/Bank account
- **billingPhone - string**: Phone associated with the CC/Bank account
- **billingEmail - string**: email associated with the CC/Bank account
- **paymentMethod - integer**: 1=cc, 2 = ach
- **gateway - string**: ACH or CC gateway E.G. authorize, nmi, brain, element
- **merchantID - string**: Credit card only
- **merchantToken - string**: Credit card only
- **lastFour - string**: Credit card only last four digits of the card
- **expMonth - string**: Credit card only - Expiration month
- **expYear - string**: Credit card only - Expiration year
- **cardType - string**: Credit card only e.g. Visa, Mastercard
- **bankName - string**: ACH only
- **accountNumber - string**: ACH only - masked account number
- **routingNumber - string**: ACH only - routing number
- **checkType - integer**: ACH only - 0=checking, 1=savings
- **accountType - integer**: ACH only -  0=personal, 1=business
- **failedAttempts - integer**
- **sentFailureDate - string**
- **lastAttemptDate - string**
- **paymentHoldDate - string**
- **retryPoints - integer**
- **initialTransactionID - string**
- **lastDeclineType - string**

---

## /paymentProfile/search

<a name="documentation_paymentProfileSearch"></a>

**Description:** Provide a set of parameters which will return a list of ids. There is no limit to the number of IDs this will return. You can then supply these ids to the `get` endpoint in order to retrieve bulk data. Every parameter available supports a simple value OR a powerful query object that gives you access to all basic comparators. 

Example: dateAdded={"operator":">","value":"2016-01-01"}

Example: dateAdded={"operator\":\"BETWEEN\",\"value\":[\"2016-05-12\",\"2016-05-13\"]}

Available operators: >, <, >=, <=, =, !=, IN, BETWEEN, LIKE, STARTSWITH, ENDSWITH, CONTAINS.

Each of the search endpoints allows for an optional parameter 'includeData'. When sent, the API will additionally send the resolved objects for the first 1000 IDs. Keep in mind when using 'includeData' that if there are more than 1000 items an additional property '{entity}IDsNoDataExported' will specify the items that are not included in the resolved data array.

### Parameters

- **paymentProfileIDs - integer**: Primary key for the paymentProfile
- **customerIDs - integer**: customer that the paymentProfile belongs to.
- **officeIDs - integer**: OfficeID of the customer that the paymentProfile belongs to.
- **dateCreated - string**: date the payment profile was created
- **dateUpdated - string**: date the payment profile was last updated
- **status - integer**: -1 = soft deleted, 0 = empty, 1 = valid, 2 = invalid, 3 = expired, 4 = last transaction failed
- **billingState - string**: State associated with the CC/Bank account
- **billingZip - string**: Zip associated with the CC/Bank account
- **paymentMethod - integer**: 1=cc, 2 = ach
- **gateway - string**: ACH or CC gateway E.G. authorize, nmi, brain, element
- **cardType - string**: Credit card only e.g. Visa, Mastercard
- **includeData - integer**: {0,1} Sends the resolved objects for the first 1000 IDs. If there are more than 1000 items an additional property paymentProfileIDsNoDataExported will specify the items that are not included in the resolved paymentProfile array.

### Response

- **paymentProfileIDs - array**

---

## /paymentProfile/update

<a name="documentation_paymentProfileUpdate"></a>

**Description:** Create a payment profile using a CreditCardToken and CreditCardTokenID from braintree/element. This will become the active payment profile for cc/ach.

### Parameters

- **paymentProfileID - integer - required**: Foreign Key to paymentProfile table
- **billingFName - string**: Billing name associated with payment profile
- **billingLName - string**: Billing name associated with payment profile
- **billingAddress1 - string**: Billing address associated with payment profile
- **billingAddress2 - string**: Billing address associated with payment profile
- **billingCity - string**: Billing city associated with payment profile
- **billingState - string**: Billing state associated with payment profile
- **billingZip - integer**: Billing zip code associated with payment profile
- **billingCountryID - string**: Billing country code associated with payment profile
- **expMonth - integer**: 2 digit month
- **expYear - integer**: 2 digit year (e.g. 21 for 2021)
- **autopay - integer**: Send as 1 to set the owning customer to autopay using this profile
- **paymentHoldDate - string**: Hold date for the payment profile

---

## /product/[id]

<a name="documentation_productGetID"></a>

**Description:** Get product data for single ID -- please provide a specific record ID in the URL structure.

### Parameters

- **-**

### Response

- **productID - integer**: Primary Key
- **officeID - integer**: OfficeID of the product; -1 is available to all offices.
- **description - string**: Description of the product
- **glAccountID - string**: glAccountID of the product
- **amount - number**: Cost of each product
- **taxable - integer**: Set as 1 if the product is taxable
- **code - string**: Product Code (up to 10 characters)
- **category - string**: Product category
- **visible - integer**: Whether or not the product is visible in lists when creating a new addon
- **salesVisible - integer**: Whether or not the product is visible for sales reps on mobile app
- **recurring - integer**: 0 means it shows up only on the service it was added to, 1 means it shows up on every service

---

## /product/create

<a name="documentation_productCreate"></a>

### Parameters

- **officeID - integer**: OfficeID of the product; -1 is available to all offices.
- **description - string - required**: Description of the product
- **amount - number - required**: Cost of each product
- **taxable - integer - required**: Set as 1 if the product is taxable
- **code - string - required**: Product Code (up to 25 characters)
- **category - string - required**: Product category
- **visible - integer - required**: Whether or not the product is visible in lists when creating a new addon
- **salesVisible - integer - required**: Whether or not the product is visible for sales reps on mobile app
- **recurring - integer - required**: 0 means it shows up only on the service it was added to, 1 means it shows up on every service

---

## /product/get

<a name="documentation_productGetBulk"></a>

**Description:** Get Bulk data for product. Accepts an array of productIDs. Returns a max of 1000 records.

### Parameters

- **productIDs - array**

### Response

- **productID - integer**: Primary Key
- **officeID - integer**: OfficeID of the product; -1 is available to all offices.
- **description - string**: Description of the product
- **glAccountID - string**: glAccountID of the product
- **amount - number**: Cost of each product
- **taxable - integer**: Set as 1 if the product is taxable
- **code - string**: Product Code (up to 10 characters)
- **category - string**: Product category
- **visible - integer**: Whether or not the product is visible in lists when creating a new addon
- **salesVisible - integer**: Whether or not the product is visible for sales reps on mobile app
- **recurring - integer**: 0 means it shows up only on the service it was added to, 1 means it shows up on every service

---

## /product/search

<a name="documentation_productSearch"></a>

**Description:** Provide a set of parameters which will return a list of ids. There is no limit to the number of IDs this will return. You can then supply these ids to the `get` endpoint in order to retrieve bulk data. Every parameter available supports a simple value OR a powerful query object that gives you access to all basic comparators. 

Example: dateAdded={"operator":">","value":"2016-01-01"}

Example: dateAdded={"operator\":\"BETWEEN\",\"value\":[\"2016-05-12\",\"2016-05-13\"]}

Available operators: >, <, >=, <=, =, !=, IN, BETWEEN, LIKE, STARTSWITH, ENDSWITH, CONTAINS.

Each of the search endpoints allows for an optional parameter 'includeData'. When sent, the API will additionally send the resolved objects for the first 1000 IDs. Keep in mind when using 'includeData' that if there are more than 1000 items an additional property '{entity}IDsNoDataExported' will specify the items that are not included in the resolved data array.

### Parameters

- **productID - integer**: Primary Key
- **officeIDs - integer**: OfficeID of the product; -1 is available to all offices.
- **code - string**: Product Code (up to 25 characters)
- **category - string**: Product category
- **visible - integer**: Whether or not the product is visible in lists when creating a new addon
- **salesVisible - integer**: Whether or not the product is visible for sales reps on mobile app
- **description - string**: Description of the product
- **includeData - integer**: {0,1} Sends the resolved objects for the first 1000 IDs. If there are more than 1000 items an additional property productIDsNoDataExported will specify the items that are not included in the resolved product array.

### Response

- **productIDs - array**

---

## /product/update

<a name="documentation_productUpdate"></a>

### Parameters

- **officeID - integer**: OfficeID of the product; -1 is available to all offices.
- **description - string**: Description of the product
- **amount - number**: Cost of each product
- **taxable - integer**: Set as 1 if the product is taxable
- **code - string**: Product Code (up to 25 characters)
- **category - string**: Product category
- **visible - integer**: Whether or not the product is visible in lists when creating a new addon
- **salesVisible - integer**: Whether or not the product is visible for sales reps on mobile app
- **recurring - integer**: 0 means it shows up only on the service it was added to, 1 means it shows up on every service
- **productID - integer - required**: Primary key to the notes table.

---

## /region/[id]

<a name="documentation_regionGetID"></a>

**Description:** Get region data for single ID -- please provide a specific record ID in the URL structure.

### Parameters

- **-**

### Response

- **regionIDs - integer**: Primary key
- **officeIDs - integer**: Office ID region belongs to
- **description - string**: Description of the region
- **created - string**: Time the region was created
- **deleted - string**: Time the region was deleted
- **points - string**: latitude and longitude bounding points separated by colons
- **type - string**
- **active - string**: Active status for the region.

---

## /region/get

<a name="documentation_regionGetBulk"></a>

**Description:** Get Bulk data for region. Accepts an array of regionIDs. Returns a max of 1000 records.

### Parameters

- **regionIDs - array**

### Response

- **regionIDs - integer**: Primary key
- **officeIDs - integer**: Office ID region belongs to
- **description - string**: Description of the region
- **created - string**: Time the region was created
- **deleted - string**: Time the region was deleted
- **points - string**: latitude and longitude bounding points separated by colons
- **type - string**
- **active - string**: Active status for the region.

---

## /region/search

<a name="documentation_regionSearch"></a>

**Description:** Provide a set of parameters which will return a list of ids. There is no limit to the number of IDs this will return. You can then supply these ids to the `get` endpoint in order to retrieve bulk data. Every parameter available supports a simple value OR a powerful query object that gives you access to all basic comparators. 

Example: dateAdded={"operator":">","value":"2016-01-01"}

Example: dateAdded={"operator\":\"BETWEEN\",\"value\":[\"2016-05-12\",\"2016-05-13\"]}

Available operators: >, <, >=, <=, =, !=, IN, BETWEEN, LIKE, STARTSWITH, ENDSWITH, CONTAINS.

Each of the search endpoints allows for an optional parameter 'includeData'. When sent, the API will additionally send the resolved objects for the first 1000 IDs. Keep in mind when using 'includeData' that if there are more than 1000 items an additional property '{entity}IDsNoDataExported' will specify the items that are not included in the resolved data array.

### Parameters

- **regionIDs - integer**: Primary key
- **officeIDs - integer**: Office ID region belongs to
- **description - string**: Description of the region
- **created - string**: Time the region was created
- **deleted - string**: Time the region was deleted
- **type - string**
- **active - string**: Active status for the region.
- **includeData - integer**: {0,1} Sends the resolved objects for the first 1000 IDs. If there are more than 1000 items an additional property regionIDsNoDataExported will specify the items that are not included in the resolved region array.

### Response

- **regionIDs - array**

---

## /reserviceReason/[id]

<a name="documentation_reserviceReasonGetID"></a>

**Description:** Get reserviceReason data for single ID -- please provide a specific record ID in the URL structure.

### Parameters

- **-**

### Response

- **reserviceReasonID - integer**
- **officeID - integer**
- **visible - integer**: Used by the FieldRoutes application to hide/show reasons from staff
- **reason - string**: Description of the appointment reschedule reason

---

## /reserviceReason/get

<a name="documentation_reserviceReasonGetBulk"></a>

**Description:** Get Bulk data for reserviceReason. Accepts an array of reserviceReasonIDs. Returns a max of 1000 records.

### Parameters

- **reserviceReasonIDs - array**

### Response

- **reserviceReasonID - integer**
- **officeID - integer**
- **visible - integer**: Used by the FieldRoutes application to hide/show reasons from staff
- **reason - string**: Description of the appointment reschedule reason

---

## /reserviceReason/search

<a name="documentation_reserviceReasonSearch"></a>

**Description:** Provide a set of parameters which will return a list of ids. There is no limit to the number of IDs this will return. You can then supply these ids to the `get` endpoint in order to retrieve bulk data. Every parameter available supports a simple value OR a powerful query object that gives you access to all basic comparators. 

Example: dateAdded={"operator":">","value":"2016-01-01"}

Example: dateAdded={"operator\":\"BETWEEN\",\"value\":[\"2016-05-12\",\"2016-05-13\"]}

Available operators: >, <, >=, <=, =, !=, IN, BETWEEN, LIKE, STARTSWITH, ENDSWITH, CONTAINS.

Each of the search endpoints allows for an optional parameter 'includeData'. When sent, the API will additionally send the resolved objects for the first 1000 IDs. Keep in mind when using 'includeData' that if there are more than 1000 items an additional property '{entity}IDsNoDataExported' will specify the items that are not included in the resolved data array.

### Parameters

- **reserviceReasonIDs - integer**
- **reserviceReasonID - integer**
- **officeIDs - integer**
- **officeID - integer**
- **visible - integer**
- **includeData - integer**: {0,1} Sends the resolved objects for the first 1000 IDs. If there are more than 1000 items an additional property reserviceReasonIDsNoDataExported will specify the items that are not included in the resolved reserviceReason array.

### Response

- **reserviceReasonIDs - array**

---

## /review/[id]

<a name="documentation_reviewGetID"></a>

**Description:** Get review data for single ID -- please provide a specific record ID in the URL structure.
 This function has an additional non-standard filter "includeCustomers". If true, the Customer object will be included in the results.

### Parameters

- **includeCustomers - integer**: Set true to include the Customer object in review results..
- **pruneSensitiveInfo - integer**: Set true to return review text that has been pruned of credit card, phone, and email information.
- **pruneProfanity - integer**: Set true to return review text that has been pruned of common profanity.

### Response

- **feedbackID - integer**
- **officeIDs - integer**
- **customerID - integer**
- **appointmentID - integer**
- **date - string**
- **starRating - integer**
- **feedback - string**
- **favorable - integer**
- **Customer - object**: The customer object associated with the review (only if 'includeCustomers' parameter is sent)

---

## /review/create

<a name="documentation_reviewCreate"></a>

### Parameters

- **appointmentID - integer - required**: Foreign key to appointments table
- **customerID - integer - required**: Foreign key to customers table
- **starRating - integer - required**: Integer 1-5 as star rating.
- **feedback - string - required**: Customer Feedback String
- **time - string - required**: Time the feedback was given

---

## /review/delete

<a name="documentation_reviewDelete"></a>

**Description:** Delete a customerFeedback item.

### Parameters

- **feedbackID - integer - required**: Primary key of the customerFeedback table

---

## /review/get

<a name="documentation_reviewGetBulk"></a>

**Description:** Get Bulk data for review. Accepts an array of feedbackIDs. Returns a max of 1000 records.
 This function has an additional non-standard filter "includeCustomers". If true, the Customer object will be included in the results.

### Parameters

- **feedbackIDs - array**
- **includeCustomers - int**: Set true to include the Customer object in review results..
- **pruneSensitiveInfo - int**: Set true to return review text that has been pruned of credit card, phone, and email information.
- **pruneProfanity - int**: Set true to return review text that has been pruned of common profanity.

### Response

- **feedbackID - integer**
- **officeIDs - integer**
- **customerID - integer**
- **appointmentID - integer**
- **date - string**
- **starRating - integer**
- **feedback - string**
- **favorable - integer**
- **Customer - object**: The customer object associated with the review (only if 'includeCustomers' parameter is sent)

---

## /review/search

<a name="documentation_reviewSearch"></a>

**Description:** Provide a set of parameters which will return a list of ids. There is no limit to the number of IDs this will return. You can then supply these ids to the `get` endpoint in order to retrieve bulk data. Every parameter available supports a simple value OR a powerful query object that gives you access to all basic comparators. 

Example: dateAdded={"operator":">","value":"2016-01-01"}

Example: dateAdded={"operator\":\"BETWEEN\",\"value\":[\"2016-05-12\",\"2016-05-13\"]}

Available operators: >, <, >=, <=, =, !=, IN, BETWEEN, LIKE, STARTSWITH, ENDSWITH, CONTAINS.

Each of the search endpoints allows for an optional parameter 'includeData'. When sent, the API will additionally send the resolved objects for the first 1000 IDs. Keep in mind when using 'includeData' that if there are more than 1000 items an additional property '{entity}IDsNoDataExported' will specify the items that are not included in the resolved data array.

### Parameters

- **feedbackIDs - integer**
- **officeIDs - integer**
- **customerIDs - integer**
- **appointmentIDs - integer**
- **date - string**
- **starRating - integer**
- **favorable - integer**
- **includeData - integer**: {0,1} Sends the resolved objects for the first 1000 IDs. If there are more than 1000 items an additional property reviewIDsNoDataExported will specify the items that are not included in the resolved review array.

### Response

- **reviewIDs - array**

---

## /review/summary

<a name="documentation_reviewSummary"></a>

### Parameters

- **zipCodes - array**: Zip codes to summarize
- **cities - array**: Cities to summarize
- **officeIDs - array**: Foreign key to offices table. Default: officeID associated with the API key sent.
- **customerIDs - array**: Foreign key to customers table
- **startTime - string**: Left bound for feedback time
- **endTime - string**: Right bound for feedback time

### Response

- **stars - object**: Object filled with stars E.G. {1:100, 2:101, 3:200, 4:300, 5:400}
- **zips - object**: Object filled with zip information E.G. {75252: {num:700, average: 2.5, zip: 75252} }
- **cities - object**: Object filled with city information E.G. {Dallas: {num:700, average: 2.5, city: "Dallas"} }
- **average - number**: Average star rating for the given parameters

---

## /review/update

<a name="documentation_reviewUpdate"></a>

### Parameters

- **appointmentID - integer**: Foreign key to appointments table
- **customerID - integer**: Foreign key to customers table
- **starRating - integer**: Integer 1-5 as star rating.
- **feedback - string**: Customer Feedback String
- **time - string**: Time the feedback was given
- **feedbackID - integer - required**: Primary key to the customerFeedback table.

---

## /route/[id]

<a name="documentation_routeGetID"></a>

**Description:** Get route data for single ID -- please provide a specific record ID in the URL structure.
 This function has additional non-standard filters Latitude and Longitude for distance calculation. If these are not specified the office location will be used.

### Parameters

- **latitude - number**: Latitude for distance calculcations. If not specified, the office longitude will be used
- **longitude - number**: Longitude for distance calculcations. If not specified, the office longitude will be used
- **maxDistance - integer**: Maximum number of miles from the route average to return.

### Response

- **routeID - integer**: Unique Identifier
- **title - integer**
- **templateID - integer**
- **dateAdded - string**
- **addedBy - integer**: ID of employee who added this route
- **officeID - integer**
- **groupID - integer**
- **groupTitle - integer**
- **date - string**: date of this route
- **dayNotes - integer**
- **dayAlert - integer**
- **dayID - integer**
- **additionalTechs - string**: EmployeeIDs of additional techs on the appointment. Comma separated.
- **assignedTech - integer**: EmployeeID assigned to route. 0 represents no tech assigned.
- **apiCanSchedule - integer**: Set as 1 when the API has access to schedule to this route.
- **scheduleTeams - string**: Array of teams that can schedule to the route.
- **scheduleTypes - string**: Array of systemTypes that can schedule to the route. {0 office staff, 1 techs, 2 sales, 3 api}
- **averageLatitude - number**: Average latitude of customers scheduled to this route (or null)
- **averageLongitude - number**: Average longitude of customers scheduled to this route (or null)
- **averageDistance - number**: Average distance of customers scheduled to this route to the given latitude and longitude parameters (or the office latitude and longitude if not sent)
- **dateUpdated - string**: date this route was last updated
- **distanceScore - integer**: Route distance score (snapshot)

---

## /route/create

<a name="documentation_routeCreate"></a>

**Description:** create a route

### Parameters

- **date - string**: DayID to create for
- **templateID - integer**: templateID from office software
- **assignedTech - integer**: employeeID
- **autoCreateGroup - integer**: set as 1 if the group should be auto-created with the template title, set as 0 to reject on missing group. Default 1
- **groupID - integer**: groupID for manually assigning to a group

---

## /route/delete

<a name="documentation_routeDelete"></a>

**Description:** Delete a route.

### Parameters

- **routeID - integer - required**: Foreign Key to routes table

---

## /route/get

<a name="documentation_routeGetBulk"></a>

**Description:** Get Bulk data for route. Accepts an array of routeIDs. Returns a max of 1000 records.
 This function has additional non-standard filters Latitude and Longitude for distance calculation. If these are not specified the office location will be used.

### Parameters

- **routeIDs - array**
- **latitude - number**: Latitude for distance calculcations. If not specified, the office longitude will be used
- **longitude - number**: Longitude for distance calculcations. If not specified, the office longitude will be used
- **maxDistance - int**: Maximum number of miles from the route average to return.

### Response

- **routeID - integer**: Unique Identifier
- **title - integer**
- **templateID - integer**
- **dateAdded - string**
- **addedBy - integer**: ID of employee who added this route
- **officeID - integer**
- **groupID - integer**
- **groupTitle - integer**
- **date - string**: date of this route
- **dayNotes - integer**
- **dayAlert - integer**
- **dayID - integer**
- **additionalTechs - string**: EmployeeIDs of additional techs on the appointment. Comma separated.
- **assignedTech - integer**: EmployeeID assigned to route. 0 represents no tech assigned.
- **apiCanSchedule - integer**: Set as 1 when the API has access to schedule to this route.
- **scheduleTeams - string**: Array of teams that can schedule to the route.
- **scheduleTypes - string**: Array of systemTypes that can schedule to the route. {0 office staff, 1 techs, 2 sales, 3 api}
- **averageLatitude - number**: Average latitude of customers scheduled to this route (or null)
- **averageLongitude - number**: Average longitude of customers scheduled to this route (or null)
- **averageDistance - number**: Average distance of customers scheduled to this route to the given latitude and longitude parameters (or the office latitude and longitude if not sent)
- **dateUpdated - string**: date this route was last updated
- **distanceScore - integer**: Route distance score (snapshot)

---

## /route/search

<a name="documentation_routeSearch"></a>

**Description:** Provide a set of parameters which will return a list of ids. There is no limit to the number of IDs this will return. You can then supply these ids to the `get` endpoint in order to retrieve bulk data. Every parameter available supports a simple value OR a powerful query object that gives you access to all basic comparators. 

Example: dateAdded={"operator":">","value":"2016-01-01"}

Example: dateAdded={"operator\":\"BETWEEN\",\"value\":[\"2016-05-12\",\"2016-05-13\"]}

Available operators: >, <, >=, <=, =, !=, IN, BETWEEN, LIKE, STARTSWITH, ENDSWITH, CONTAINS.

Each of the search endpoints allows for an optional parameter 'includeData'. When sent, the API will additionally send the resolved objects for the first 1000 IDs. Keep in mind when using 'includeData' that if there are more than 1000 items an additional property '{entity}IDsNoDataExported' will specify the items that are not included in the resolved data array.
 If the includeData flag is set the additional parameters from getData (latitude, longitude) can be used.

### Parameters

- **officeIDs - integer**
- **routeIDs - integer**
- **date - string**
- **dateStart - string**
- **dateEnd - string**
- **assignedTech - integer**
- **apiCanSchedule - boolean**: Send as 1 to retrieve only routes that the API can schedule for.
- **lastUpdated - string**
- **dateUpdated - string**
- **employeeTeams - integer**: Send with an employeeID to limit routes to those that the employee's team is assigned to via route can schedule settings.
- **excludeGlobalSalesTeam - integer**: send as 1 to ignore routes available to the global sales team
- **groupTitle - string**: Title of the group associated with the route
- **includeData - integer**: {0,1} Sends the resolved objects for the first 1000 IDs. If there are more than 1000 items an additional property routeIDsNoDataExported will specify the items that are not included in the resolved route array.

### Response

- **routeIDs - array**

---

## /route/update

<a name="documentation_routeUpdate"></a>

**Description:** Update route details

### Parameters

- **date - string**: DayID to create for
- **assignedTech - integer**: employeeID
- **autoCreateGroup - integer**: set as 1 if the group should be auto-created with the template title, set as 0 to reject on missing group. Default 1
- **groupID - integer**: groupID for manually assigning to a group
- **routeID - integer - required**: Primary key to the route table.

---

## /routeTemplate/[id]

<a name="documentation_routeTemplateGetID"></a>

**Description:** Get routeTemplate data for single ID -- please provide a specific record ID in the URL structure.

### Parameters

- **-**

### Response

- **templateID - integer**
- **officeID - integer**
- **templateName - string**
- **officeDefault - string**
- **visible - string**

---

## /routeTemplate/get

<a name="documentation_routeTemplateGetBulk"></a>

**Description:** Get Bulk data for routeTemplate. Accepts an array of templateIDs. Returns a max of 1000 records.

### Parameters

- **templateIDs - array**

### Response

- **templateID - integer**
- **officeID - integer**
- **templateName - string**
- **officeDefault - string**
- **visible - string**

---

## /routeTemplate/search

<a name="documentation_routeTemplateSearch"></a>

**Description:** Provide a set of parameters which will return a list of ids. There is no limit to the number of IDs this will return. You can then supply these ids to the `get` endpoint in order to retrieve bulk data. Every parameter available supports a simple value OR a powerful query object that gives you access to all basic comparators. 

Example: dateAdded={"operator":">","value":"2016-01-01"}

Example: dateAdded={"operator\":\"BETWEEN\",\"value\":[\"2016-05-12\",\"2016-05-13\"]}

Available operators: >, <, >=, <=, =, !=, IN, BETWEEN, LIKE, STARTSWITH, ENDSWITH, CONTAINS.

Each of the search endpoints allows for an optional parameter 'includeData'. When sent, the API will additionally send the resolved objects for the first 1000 IDs. Keep in mind when using 'includeData' that if there are more than 1000 items an additional property '{entity}IDsNoDataExported' will specify the items that are not included in the resolved data array.

### Parameters

- **templateIDs - integer**: Primary key
- **templateID - integer**: Primary key alias
- **officeIDs - integer**: Office ID route template belongs to
- **includeData - integer**: {0,1} Sends the resolved objects for the first 1000 IDs. If there are more than 1000 items an additional property routeTemplateIDsNoDataExported will specify the items that are not included in the resolved routeTemplate array.

### Response

- **routeTemplateIDs - array**

---

## /servicePlan/[id]

<a name="documentation_servicePlanGetID"></a>

**Description:** Get servicePlan data for single ID -- please provide a specific record ID in the URL structure.

### Parameters

- **includeCancellationReason - integer**: Send as 1 to retrieve an array of cancellationNotes associated with the subscription.

### Response

- **subscriptionID - integer**: Unique ID
- **customerID - integer**: Customer ID which this subscription belongs to
- **billToAccountID - integer**: Billing Account which this subscription belongs to
- **officeID - integer**: Office ID which this subscription belongs to
- **dateAdded - string**: Date this subscription was added / created. Sold date.
- **contractAdded - string**: Date the last contract was added / created.
- **active - integer**: 0: frozen, 1: active and being placed in the job pool.
- **activeText - integer**: Friendly text version of active
- **initialQuote - number**: The retail quoted price for the initial service on this subscription.
- **initialDiscount - number**: The discount to be applied to the initial service
- **initialServiceTotal - number**: The net amount of initialQuote-initialDiscount. DOES NOT INCLUDE add-ons
- **yifDiscount - number**: The discount provided if paying for a year in advance
- **recurringCharge - number**: A shortcut for the subtotal of the recurring ticket
- **contractValue - number**: Calculated as the initial total + the number of recurring services*recurringCharge. There are some tweaks available for different companies / preferences, particularly when dealing with recurring billing.
- **annualRecurringValue - number**: Calculated as the recurringCharge * the number of services/year.
- **billingFrequency - integer**: How often this subscription gets their invoice generated -- can be seperate from when their service takes place. 0 / -1 represents getting billed after each service.
- **frequency - integer**: The frequency that the services get scheduled. -1 represents One-Time, 0 represents 'as needed'. Greater than 0 represents the frequency in days. If it is divisible by 30, it is converted to months -- so 90 would represent 3 months and not necessarily 90 days.
- **followupService - integer**: How many days after the initial service to schedule the first recurring service.
- **agreementLength - number**: Agreement Length
- **nextService - string**: When the next service is due.
- **lastCompleted - string**: When the last service was completed
- **serviceID - integer**: The service type ID for the regular recurring services
- **serviceType - string**: Friendly description of the serviceID
- **soldBy - integer**: The employee ID who gets credit for this sale. Defaults to the user who added the subscription
- **soldBy2 - integer**: Additional employeeID that gets credit for this sale
- **soldBy3 - integer**: Additional employeeID that gets credit for this sale
- **preferredTech - integer**: preferred tech ID
- **addedBy - integer**: The employee ID that added the subscription
- **initialAppointmentID - integer**: The initial service appointment ID
- **initialStatus - integer**: A shortcut for the status of the initial appointment
- **initialStatusText - string**: Friendly text version of the initialStatus
- **dateCancelled - string**: The date the subscription was cancelled if any.
- **dateUpdated - string**: The date the subscription was last updated.
- **cxlNotes - string**: The notes associated with cancelling this appointment. Group_Concat'ed in case of multiple cancellations
- **subscriptionLink - string**: Subscription Link
- **poNumber - string**: Subscription poNumber
- **appointmentIDs - integer**: Every appointment attached to this subscription
- **completedAppointmentIDs - integer**: Every completed appointment attached to this subscription
- **initialAppointment - object**: The initial appointment object if includeInitialAppointments = true
- **recurringTicket - object**: The recurring ticket template associated with this subscription
- **addOns - string**: An array of Add-On objects associated with the INITIAL appointment.
- **leadID - integer**: Primary key for lead
- **leadDateAdded - string**: Time that this lead was created
- **leadUpdated - string**: Time that this lead was last updated
- **leadAddedBy - integer**: employeeID that created this lead
- **leadSourceID - integer**: Lead Source ID
- **leadSource - string**: Lead Source Description
- **leadStatus - integer**: Lead Status
- **leadStatusText - string**: Lead Status Text
- **leadStageID - integer**: Lead Stage ID
- **leadStage - string**: Lead Stage Description
- **leadAssignedTo - integer**: EmployeeID to whom the lead is assigned
- **leadDateAssigned - string**: Time the lead was assigned
- **leadValue - number**: Value of the lead
- **leadDateClosed - string**: Time the lead was closed
- **leadLostReason - string**: Lead Lost Reason ID
- **leadLostReasonText - string**: Lead Lost Reason
- **sourceID - integer**: Subscription Source ID
- **source - string**: Subscription Source Description
- **annualRecurringServices - integer**: Services per year without counting initial
- **unitIDs - integer**: An array of unit IDs available for this subscription (for multi unit customers) - defaults to all unless specific units have been selected
- **regionID - integer**: RegionID of the subscription
- **initialInvoice - string**: When the initial invoice should get generated. INITIAL_COMPLETION = when the initial service is completed. SIGNED_AGREEMENT = when the agreement is signed. INITIAL_BILLING_DATE = on a specified billing date.
- **initialBillingDate - string**: The date to generate initial invoice when initialInvoice = INITIAL_BILLING_DATE
- **renewalFrequency - integer**: How often a subscription is due for renewal.
- **renewalDate - string**: Next renewal date
- **customDate - string**: custom next appointment date
- **sentriconConnected - integer**: Set as 1 if the subscription is connected to sentricon
- **sentriconSiteID - string**: Sentricon Site ID or null if not connected to Sentricon
- **seasonalStart - string**: Date the season starts or 0000-00-00 if it is not a seasonal subscription
- **seasonalEnd - string**: Date the season ends or 0000-00-00 if it is not a seasonal subscription
- **nextBillingDate - string**: Next billing date for the subscription
- **maxMonthlyCharge - number**: Max monthly charge for the subscription
- **expirationDate - string**: Expiration Date for the subscription.
- **lastAppointment - string**: Last completed appointment associated with the subscription
- **templateType - string**: The template type associated with the service type
- **parentID - integer**: The subscriptionID of the service plan that the service round belongs to
- **duration - string**: Default duration of services in minutes
- **preferredDays - integer**: Empty String no preference, 0-Sunday, 1-Monday, 2-Tuesday, 3-Wednesday, 4-Thursday, 5-Friday, 6-Saturday
- **preferredStart - string**: Preferred appointment start time bound
- **preferredEnd - string**: Preferred appointment end time bound
- **callAhead - integer**: int in minutes
- **nextServicePlanRoundID - integer**: The servicePlanRoundID of the next upcoming service
- **endBillingDate - string**: Date of last invoice for the service plan
- **cycleStartDate - string**: Date the first service round for this service plan starts
- **cycleEndDate - string**: Date the last service round for this service plan ends
- **cycleAnnualValue - number**: The annual value for the current cycle

---

## /servicePlan/create

<a name="documentation_servicePlanCreate"></a>

**Description:** create a service plan

### Parameters

- **subscriptionLink - string**: Subscription Link for import
- **serviceID - integer - required**: The service type ID for the regular recurring services
- **customerID - integer - required**: Customer ID which this subscription belongs to
- **billToAccountID - integer**: Billing Account which this subscription belongs to
- **active - integer**: 0: frozen, 1: active and being placed in the job pool.
- **billingFrequency - integer**: Frequency that an invoice is generated for this service. -1/0
- **frequency - integer**: The frequency that the services get scheduled. -1 represents One-Time, 0 represents 'as needed'. Greater than 0 represents the frequency in days. If it is divisible by 30, it is converted to months -- so 90 would represent 3 months and not necessarily 90 days.
- **seasonalStart - string**: Seasonal Start
- **seasonalEnd - string**: Seasonal End
- **followupDelay - integer**: How many days after the initial service to schedule the first recurring service. Set as -1 to use frequency
- **agreementLength - integer**: Agreement Length
- **preferredTech - integer**: The employee ID of the preferred tech - 0 for no preference
- **preferredDays - integer**: Preferred appointment day (0-SUN, 1-MON, 2-TUE, 3-WED, 4-THU, 5-FRI, 6-SAT)
- **preferredStart - string**: Preferred appointment start time window in local time e.g. 00:00:00
- **preferredEnd - string**: Preferred appointment end time window in local time e.g. 14:30:00
- **sourceID - integer**: Subscription Source ID
- **regionID - integer**: RegionID of the subscription
- **renewalFrequency - integer**: How often a subscription is due for renewal.
- **renewalDate - string**: Next renewal date
- **customDate - string**: Custom next appointment date for the subscription.
- **customScheduleID - integer**: ID of a pre-defined custom-schedule for services. frequency will be set to -3.
- **nextBillingDate - string**: Next billing date for the subscription
- **duration - integer**: The default duration in minutes for the appointment. Set to -1 to inherit from the service type.
- **leadValue - number**: Value of the lead
- **expirationDate - integer**: Expiration date of the subscription
- **addedBy - integer**: The employee ID that added the subscription
- **dateCancelled - string**: Date the subscription was cancelled
- **billingTermsDays - integer**: Net Billing Days
- **poNumber - string**: subscription poNumber
- **callAhead - integer**: int in minutes
- **soldBy - integer**: The employee ID who gets credit for this sale. Defaults to the user who added the subscription
- **soldBy2 - integer**: Additional employeeID that gets credit for this sale
- **soldBy3 - integer**: Additional employeeID that gets credit for this sale
- **convertToLead - integer**: Automatically convert the subscription to a lead following the request
- **serviceCharge - integer**: Amount that will be charged each service. To edit this after create use ticket/update with the subscriptionID and templateType=R
- **addons - object**: Array of ticket addon objects, see ticket/createAddon for parameters. To edit this after create use ticket/update with the subscriptionID and templateType=R
- **initialCharge - integer**: Amount that will be charged on the initial service. To edit this after create use ticket/update with the subscriptionID and templateType=I
- **initialAddons - object**: Array of ticket addon objects, see ticket/createAddon for parameters. To edit this after create use ticket/update with the subscriptionID and templateType=I
- **initialInvoice - string**: When the initial invoice should get generated. INITIAL_COMPLETION = when the initial service is completed. SIGNED_AGREEMENT = when the agreement is signed. INITIAL_BILLING_DATE = on a specified billing date.
- **nextServicePlanRoundID - integer**: The servicePlanRoundID of the next upcoming service
- **endBillingDate - string**: Date of last invoice for the service plan

---

## /servicePlan/get

<a name="documentation_servicePlanGetBulk"></a>

**Description:** Get Bulk data for servicePlan. Accepts an array of subscriptionIDs. Returns a max of 1000 records.

### Parameters

- **subscriptionIDs - array**
- **includeCancellationReason - int**: Send as 1 to retrieve an array of cancellationNotes associated with the subscription.

### Response

- **subscriptionID - integer**: Unique ID
- **customerID - integer**: Customer ID which this subscription belongs to
- **billToAccountID - integer**: Billing Account which this subscription belongs to
- **officeID - integer**: Office ID which this subscription belongs to
- **dateAdded - string**: Date this subscription was added / created. Sold date.
- **contractAdded - string**: Date the last contract was added / created.
- **active - integer**: 0: frozen, 1: active and being placed in the job pool.
- **activeText - integer**: Friendly text version of active
- **initialQuote - number**: The retail quoted price for the initial service on this subscription.
- **initialDiscount - number**: The discount to be applied to the initial service
- **initialServiceTotal - number**: The net amount of initialQuote-initialDiscount. DOES NOT INCLUDE add-ons
- **yifDiscount - number**: The discount provided if paying for a year in advance
- **recurringCharge - number**: A shortcut for the subtotal of the recurring ticket
- **contractValue - number**: Calculated as the initial total + the number of recurring services*recurringCharge. There are some tweaks available for different companies / preferences, particularly when dealing with recurring billing.
- **annualRecurringValue - number**: Calculated as the recurringCharge * the number of services/year.
- **billingFrequency - integer**: How often this subscription gets their invoice generated -- can be seperate from when their service takes place. 0 / -1 represents getting billed after each service.
- **frequency - integer**: The frequency that the services get scheduled. -1 represents One-Time, 0 represents 'as needed'. Greater than 0 represents the frequency in days. If it is divisible by 30, it is converted to months -- so 90 would represent 3 months and not necessarily 90 days.
- **followupService - integer**: How many days after the initial service to schedule the first recurring service.
- **agreementLength - number**: Agreement Length
- **nextService - string**: When the next service is due.
- **lastCompleted - string**: When the last service was completed
- **serviceID - integer**: The service type ID for the regular recurring services
- **serviceType - string**: Friendly description of the serviceID
- **soldBy - integer**: The employee ID who gets credit for this sale. Defaults to the user who added the subscription
- **soldBy2 - integer**: Additional employeeID that gets credit for this sale
- **soldBy3 - integer**: Additional employeeID that gets credit for this sale
- **preferredTech - integer**: preferred tech ID
- **addedBy - integer**: The employee ID that added the subscription
- **initialAppointmentID - integer**: The initial service appointment ID
- **initialStatus - integer**: A shortcut for the status of the initial appointment
- **initialStatusText - string**: Friendly text version of the initialStatus
- **dateCancelled - string**: The date the subscription was cancelled if any.
- **dateUpdated - string**: The date the subscription was last updated.
- **cxlNotes - string**: The notes associated with cancelling this appointment. Group_Concat'ed in case of multiple cancellations
- **subscriptionLink - string**: Subscription Link
- **poNumber - string**: Subscription poNumber
- **appointmentIDs - integer**: Every appointment attached to this subscription
- **completedAppointmentIDs - integer**: Every completed appointment attached to this subscription
- **initialAppointment - object**: The initial appointment object if includeInitialAppointments = true
- **recurringTicket - object**: The recurring ticket template associated with this subscription
- **addOns - string**: An array of Add-On objects associated with the INITIAL appointment.
- **leadID - integer**: Primary key for lead
- **leadDateAdded - string**: Time that this lead was created
- **leadUpdated - string**: Time that this lead was last updated
- **leadAddedBy - integer**: employeeID that created this lead
- **leadSourceID - integer**: Lead Source ID
- **leadSource - string**: Lead Source Description
- **leadStatus - integer**: Lead Status
- **leadStatusText - string**: Lead Status Text
- **leadStageID - integer**: Lead Stage ID
- **leadStage - string**: Lead Stage Description
- **leadAssignedTo - integer**: EmployeeID to whom the lead is assigned
- **leadDateAssigned - string**: Time the lead was assigned
- **leadValue - number**: Value of the lead
- **leadDateClosed - string**: Time the lead was closed
- **leadLostReason - string**: Lead Lost Reason ID
- **leadLostReasonText - string**: Lead Lost Reason
- **sourceID - integer**: Subscription Source ID
- **source - string**: Subscription Source Description
- **annualRecurringServices - integer**: Services per year without counting initial
- **unitIDs - integer**: An array of unit IDs available for this subscription (for multi unit customers) - defaults to all unless specific units have been selected
- **regionID - integer**: RegionID of the subscription
- **initialInvoice - string**: When the initial invoice should get generated. INITIAL_COMPLETION = when the initial service is completed. SIGNED_AGREEMENT = when the agreement is signed. INITIAL_BILLING_DATE = on a specified billing date.
- **initialBillingDate - string**: The date to generate initial invoice when initialInvoice = INITIAL_BILLING_DATE
- **renewalFrequency - integer**: How often a subscription is due for renewal.
- **renewalDate - string**: Next renewal date
- **customDate - string**: custom next appointment date
- **sentriconConnected - integer**: Set as 1 if the subscription is connected to sentricon
- **sentriconSiteID - string**: Sentricon Site ID or null if not connected to Sentricon
- **seasonalStart - string**: Date the season starts or 0000-00-00 if it is not a seasonal subscription
- **seasonalEnd - string**: Date the season ends or 0000-00-00 if it is not a seasonal subscription
- **nextBillingDate - string**: Next billing date for the subscription
- **maxMonthlyCharge - number**: Max monthly charge for the subscription
- **expirationDate - string**: Expiration Date for the subscription.
- **lastAppointment - string**: Last completed appointment associated with the subscription
- **templateType - string**: The template type associated with the service type
- **parentID - integer**: The subscriptionID of the service plan that the service round belongs to
- **duration - string**: Default duration of services in minutes
- **preferredDays - integer**: Empty String no preference, 0-Sunday, 1-Monday, 2-Tuesday, 3-Wednesday, 4-Thursday, 5-Friday, 6-Saturday
- **preferredStart - string**: Preferred appointment start time bound
- **preferredEnd - string**: Preferred appointment end time bound
- **callAhead - integer**: int in minutes
- **nextServicePlanRoundID - integer**: The servicePlanRoundID of the next upcoming service
- **endBillingDate - string**: Date of last invoice for the service plan
- **cycleStartDate - string**: Date the first service round for this service plan starts
- **cycleEndDate - string**: Date the last service round for this service plan ends
- **cycleAnnualValue - number**: The annual value for the current cycle

---

## /servicePlan/search

<a name="documentation_servicePlanSearch"></a>

**Description:** Provide a set of parameters which will return a list of ids. There is no limit to the number of IDs this will return. You can then supply these ids to the `get` endpoint in order to retrieve bulk data. Every parameter available supports a simple value OR a powerful query object that gives you access to all basic comparators. 

Example: dateAdded={"operator":">","value":"2016-01-01"}

Example: dateAdded={"operator\":\"BETWEEN\",\"value\":[\"2016-05-12\",\"2016-05-13\"]}

Available operators: >, <, >=, <=, =, !=, IN, BETWEEN, LIKE, STARTSWITH, ENDSWITH, CONTAINS.

Each of the search endpoints allows for an optional parameter 'includeData'. When sent, the API will additionally send the resolved objects for the first 1000 IDs. Keep in mind when using 'includeData' that if there are more than 1000 items an additional property '{entity}IDsNoDataExported' will specify the items that are not included in the resolved data array.

### Parameters

- **officeIDs - integer**
- **active - integer**: Default: (0,1). 0: Frozen and no longer being placed in the job pool, 1: Active, -3: Lead
- **customerIDs - integer**: Customer who owns this subcscription
- **subscriptionIDs - integer**: Unique Identifier for this Subscription
- **soldBy - integer**: The user who is being credited for this sale. Used in stats and commissions reporting
- **preferredTech - integer**: The employee ID of the preferred tech
- **dateAdded - string**: Date this subscription was created / added / sold
- **dateCancelled - string**: Date this subscription was cancelled
- **dateUpdated - string**: Last date that something was changed on this subscription.
- **serviceType - integer**: The recurring service type to be scheduled for this subscription
- **serviceID - integer**: The recurring service type to be scheduled for this subscription
- **frequency - integer**: The service frequency of this subscription. >0: The number of days, if it is divisible by 30 it is the number of months, -3: Custom Schedule
- **dueDate - string**: When this subscription is due for their next service
- **lastCompleted - string**: When the last service was completed
- **dateUpdatedStart - string**
- **dateUpdatedEnd - string**
- **dateAddedStart - string**
- **dateAddedEnd - string**
- **contractIDs - integer**: The contract ID signed for the subscription
- **leadDateClosed - string**: The date the lead was closed
- **leadDateAssigned - string**: The date the lead was assigned
- **leadStageID - integer**: The stageID of the lead
- **leadAssignedTo - integer**: The employeeID the lead was assigned to
- **leadAddedBy - integer**: The employeeID who added the lead
- **leadDateAdded - string**: The date the lead was added
- **leadUpdated - string**: The date the lead was last updated
- **leadSourceID - integer**: The sourceID of the lead
- **sourceID - integer**: The sourceID of the subscription
- **nextService - string**: The date that the next service is due
- **regionID - integer**: RegionID of the subscription
- **lastRegularServiceDate - string**: Date for last service of subscription type
- **lastRegularServiceStatus - integer**: Last regular service status
- **sentriconConnected - integer**: Set as 1 if the subscription is connected to sentricon
- **sentriconSiteID - string**: Sentricon Site ID or null if not connected to Sentricon
- **nextBillingDate - string**: Next billing date for the subscription
- **parentID - integer**
- **templateType - string**: The template type associated with the service type
- **lastAppointment - string**: Last appointment of the subscription
- **cycleStartDate - string**: Date the first service round for this service plan starts
- **cycleEndDate - string**: Date the last service round for this service plan ends
- **cycleAnnualValue - number**: The annual value for the current cycle
- **includeData - integer**: {0,1} Sends the resolved objects for the first 1000 IDs. If there are more than 1000 items an additional property servicePlanIDsNoDataExported will specify the items that are not included in the resolved servicePlan array.

### Response

- **servicePlanIDs - array**

---

## /servicePlan/update

<a name="documentation_servicePlanUpdate"></a>

**Description:** Update service plan subscription details

### Parameters

- **subscriptionLink - string**: Subscription Link for import
- **serviceID - integer**: The service type ID for the regular recurring services
- **customerID - integer**: Customer ID which this subscription belongs to
- **billToAccountID - integer**: Billing Account which this subscription belongs to
- **active - integer**: 0: frozen, 1: active and being placed in the job pool.
- **billingFrequency - integer**: Frequency that an invoice is generated for this service. -1/0
- **frequency - integer**: The frequency that the services get scheduled. -1 represents One-Time, 0 represents 'as needed'. Greater than 0 represents the frequency in days. If it is divisible by 30, it is converted to months -- so 90 would represent 3 months and not necessarily 90 days.
- **seasonalStart - string**: Seasonal Start
- **seasonalEnd - string**: Seasonal End
- **followupDelay - integer**: How many days after the initial service to schedule the first recurring service. Set as -1 to use frequency
- **agreementLength - integer**: Agreement Length
- **preferredTech - integer**: The employee ID of the preferred tech - 0 for no preference
- **preferredDays - integer**: Preferred appointment day (0-SUN, 1-MON, 2-TUE, 3-WED, 4-THU, 5-FRI, 6-SAT)
- **preferredStart - string**: Preferred appointment start time window in local time e.g. 00:00:00
- **preferredEnd - string**: Preferred appointment end time window in local time e.g. 14:30:00
- **sourceID - integer**: Subscription Source ID
- **regionID - integer**: RegionID of the subscription
- **renewalFrequency - integer**: How often a subscription is due for renewal.
- **renewalDate - string**: Next renewal date
- **customDate - string**: Custom next appointment date for the subscription.
- **customScheduleID - integer**: ID of a pre-defined custom-schedule for services. frequency will be set to -3.
- **nextBillingDate - string**: Next billing date for the subscription
- **duration - integer**: The default duration in minutes for the appointment. Set to -1 to inherit from the service type.
- **leadValue - number**: Value of the lead
- **expirationDate - integer**: Expiration date of the subscription
- **addedBy - integer**: The employee ID that added the subscription
- **dateCancelled - string**: Date the subscription was cancelled
- **billingTermsDays - integer**: Net Billing Days
- **poNumber - string**: subscription poNumber
- **callAhead - integer**: int in minutes
- **soldBy - integer**: The employee ID who gets credit for this sale. Defaults to the user who added the subscription
- **soldBy2 - integer**: Additional employeeID that gets credit for this sale
- **soldBy3 - integer**: Additional employeeID that gets credit for this sale
- **convertToLead - integer**: Automatically convert the subscription to a lead following the request
- **initialInvoice - string**: When the initial invoice should get generated. INITIAL_COMPLETION = when the initial service is completed. SIGNED_AGREEMENT = when the agreement is signed. INITIAL_BILLING_DATE = on a specified billing date.
- **subscriptionID - integer - required**: Primary key to the tickets table.

---

## /servicePlan/updateLeadStage

<a name="documentation_servicePlanUpdateLeadStage"></a>

### Parameters

- **subscriptionID - integer - required**: Foreign key to subscriptions table.
- **subscriptionLink - integer**: Alternative to subscriptionID. This is the "SubscriptionID" sent during an API insert through import/main.
- **stageID - integer**: Lead stage ID.
- **status - integer**: 0 - Convert To Lead, 1 - Convert to subscription (lead won)
- **lostReason - integer**: Lead Lost Reason

---

## /servicePlanRound/[id]

<a name="documentation_servicePlanRoundGetID"></a>

**Description:** Get servicePlanRound data for single ID -- please provide a specific record ID in the URL structure.

### Parameters

- **-**

### Response

- **subscriptionID - integer**: Unique ID
- **customerID - integer**: Customer ID which this subscription belongs to
- **billToAccountID - integer**: Billing Account which this subscription belongs to
- **officeID - integer**: Office ID which this subscription belongs to
- **dateAdded - string**: Date this subscription was added / created. Sold date.
- **contractAdded - string**: Date the last contract was added / created.
- **active - integer**: 0: frozen, 1: active and being placed in the job pool.
- **activeText - integer**: Friendly text version of active
- **initialQuote - number**: The retail quoted price for the initial service on this subscription.
- **initialDiscount - number**: The discount to be applied to the initial service
- **initialServiceTotal - number**: The net amount of initialQuote-initialDiscount. DOES NOT INCLUDE add-ons
- **yifDiscount - number**: The discount provided if paying for a year in advance
- **recurringCharge - number**: A shortcut for the subtotal of the recurring ticket
- **contractValue - number**: Calculated as the initial total + the number of recurring services*recurringCharge. There are some tweaks available for different companies / preferences, particularly when dealing with recurring billing.
- **annualRecurringValue - number**: Calculated as the recurringCharge * the number of services/year.
- **billingFrequency - integer**: How often this subscription gets their invoice generated -- can be seperate from when their service takes place. 0 / -1 represents getting billed after each service.
- **frequency - integer**: The frequency that the services get scheduled. -1 represents One-Time, 0 represents 'as needed'. Greater than 0 represents the frequency in days. If it is divisible by 30, it is converted to months -- so 90 would represent 3 months and not necessarily 90 days.
- **followupService - integer**: How many days after the initial service to schedule the first recurring service.
- **agreementLength - number**: Agreement Length
- **nextService - string**: When the next service is due.
- **lastCompleted - string**: When the last service was completed
- **serviceID - integer**: The service type ID for the regular recurring services
- **serviceType - string**: Friendly description of the serviceID
- **soldBy - integer**: The employee ID who gets credit for this sale. Defaults to the user who added the subscription
- **soldBy2 - integer**: Additional employeeID that gets credit for this sale
- **soldBy3 - integer**: Additional employeeID that gets credit for this sale
- **preferredTech - integer**: preferred tech ID
- **addedBy - integer**: The employee ID that added the subscription
- **initialAppointmentID - integer**: The initial service appointment ID
- **initialStatus - integer**: A shortcut for the status of the initial appointment
- **initialStatusText - string**: Friendly text version of the initialStatus
- **dateCancelled - string**: The date the subscription was cancelled if any.
- **dateUpdated - string**: The date the subscription was last updated.
- **cxlNotes - string**: The notes associated with cancelling this appointment. Group_Concat'ed in case of multiple cancellations
- **subscriptionLink - string**: Subscription Link
- **poNumber - string**: Subscription poNumber
- **appointmentIDs - integer**: Every appointment attached to this subscription
- **completedAppointmentIDs - integer**: Every completed appointment attached to this subscription
- **initialAppointment - object**: The initial appointment object if includeInitialAppointments = true
- **recurringTicket - object**: The recurring ticket template associated with this subscription
- **addOns - string**: An array of Add-On objects associated with the INITIAL appointment.
- **leadID - integer**: Primary key for lead
- **leadDateAdded - string**: Time that this lead was created
- **leadUpdated - string**: Time that this lead was last updated
- **leadAddedBy - integer**: employeeID that created this lead
- **leadSourceID - integer**: Lead Source ID
- **leadSource - string**: Lead Source Description
- **leadStatus - integer**: Lead Status
- **leadStatusText - string**: Lead Status Text
- **leadStageID - integer**: Lead Stage ID
- **leadStage - string**: Lead Stage Description
- **leadAssignedTo - integer**: EmployeeID to whom the lead is assigned
- **leadDateAssigned - string**: Time the lead was assigned
- **leadValue - number**: Value of the lead
- **leadDateClosed - string**: Time the lead was closed
- **leadLostReason - string**: Lead Lost Reason ID
- **leadLostReasonText - string**: Lead Lost Reason
- **sourceID - integer**: Subscription Source ID
- **source - string**: Subscription Source Description
- **annualRecurringServices - integer**: Services per year without counting initial
- **unitIDs - integer**: An array of unit IDs available for this subscription (for multi unit customers) - defaults to all unless specific units have been selected
- **regionID - integer**: RegionID of the subscription
- **initialInvoice - string**: When the initial invoice should get generated. INITIAL_COMPLETION = when the initial service is completed. SIGNED_AGREEMENT = when the agreement is signed. INITIAL_BILLING_DATE = on a specified billing date.
- **initialBillingDate - string**: The date to generate initial invoice when initialInvoice = INITIAL_BILLING_DATE
- **renewalFrequency - integer**: How often a subscription is due for renewal.
- **renewalDate - string**: Next renewal date
- **customDate - string**: custom next appointment date
- **sentriconConnected - integer**: Set as 1 if the subscription is connected to sentricon
- **sentriconSiteID - string**: Sentricon Site ID or null if not connected to Sentricon
- **seasonalStart - string**: Date the season starts or 0000-00-00 if it is not a seasonal subscription
- **seasonalEnd - string**: Date the season ends or 0000-00-00 if it is not a seasonal subscription
- **nextBillingDate - string**: Next billing date for the subscription
- **maxMonthlyCharge - number**: Max monthly charge for the subscription
- **expirationDate - string**: Expiration Date for the subscription.
- **lastAppointment - string**: Last completed appointment associated with the subscription
- **templateType - string**: The template type associated with the service type
- **parentID - integer**: The subscriptionID of the service plan that the service round belongs to
- **duration - string**: Default duration of services in minutes
- **preferredDays - integer**: Empty String no preference, 0-Sunday, 1-Monday, 2-Tuesday, 3-Wednesday, 4-Thursday, 5-Friday, 6-Saturday
- **preferredStart - string**: Preferred appointment start time bound
- **preferredEnd - string**: Preferred appointment end time bound
- **callAhead - integer**: int in minutes
- **nextServicePlanRoundID - integer**: The servicePlanRoundID for this service round
- **servicePlanID - integer**: The serviceID of the service plan that this round belongs to
- **startDate - string**: Start date for this service round
- **endDate - string**: End date for this service round
- **prerequisiteServicePlanRoundID - integer**: The servicePlanRoundID of the prior round that this round is dependent on
- **daysAfterPrerequisite - integer**: Days to wait after the prior service round completed before starting this service round
- **maxDelay - integer**: Maximum number of days to wait before starting this service round
- **skipped - string**: The skip/omit status for the round
- **skipReasonID - integer**: The skip reason for MANUAL_SKIPPED rounds, defined in skipReasons table
- **dateSkipped - string**: The date that the skip status was changed

---

## /servicePlanRound/get

<a name="documentation_servicePlanRoundGetBulk"></a>

**Description:** Get Bulk data for servicePlanRound. Accepts an array of subscriptionIDs. Returns a max of 1000 records.

### Parameters

- **subscriptionIDs - array**

### Response

- **subscriptionID - integer**: Unique ID
- **customerID - integer**: Customer ID which this subscription belongs to
- **billToAccountID - integer**: Billing Account which this subscription belongs to
- **officeID - integer**: Office ID which this subscription belongs to
- **dateAdded - string**: Date this subscription was added / created. Sold date.
- **contractAdded - string**: Date the last contract was added / created.
- **active - integer**: 0: frozen, 1: active and being placed in the job pool.
- **activeText - integer**: Friendly text version of active
- **initialQuote - number**: The retail quoted price for the initial service on this subscription.
- **initialDiscount - number**: The discount to be applied to the initial service
- **initialServiceTotal - number**: The net amount of initialQuote-initialDiscount. DOES NOT INCLUDE add-ons
- **yifDiscount - number**: The discount provided if paying for a year in advance
- **recurringCharge - number**: A shortcut for the subtotal of the recurring ticket
- **contractValue - number**: Calculated as the initial total + the number of recurring services*recurringCharge. There are some tweaks available for different companies / preferences, particularly when dealing with recurring billing.
- **annualRecurringValue - number**: Calculated as the recurringCharge * the number of services/year.
- **billingFrequency - integer**: How often this subscription gets their invoice generated -- can be seperate from when their service takes place. 0 / -1 represents getting billed after each service.
- **frequency - integer**: The frequency that the services get scheduled. -1 represents One-Time, 0 represents 'as needed'. Greater than 0 represents the frequency in days. If it is divisible by 30, it is converted to months -- so 90 would represent 3 months and not necessarily 90 days.
- **followupService - integer**: How many days after the initial service to schedule the first recurring service.
- **agreementLength - number**: Agreement Length
- **nextService - string**: When the next service is due.
- **lastCompleted - string**: When the last service was completed
- **serviceID - integer**: The service type ID for the regular recurring services
- **serviceType - string**: Friendly description of the serviceID
- **soldBy - integer**: The employee ID who gets credit for this sale. Defaults to the user who added the subscription
- **soldBy2 - integer**: Additional employeeID that gets credit for this sale
- **soldBy3 - integer**: Additional employeeID that gets credit for this sale
- **preferredTech - integer**: preferred tech ID
- **addedBy - integer**: The employee ID that added the subscription
- **initialAppointmentID - integer**: The initial service appointment ID
- **initialStatus - integer**: A shortcut for the status of the initial appointment
- **initialStatusText - string**: Friendly text version of the initialStatus
- **dateCancelled - string**: The date the subscription was cancelled if any.
- **dateUpdated - string**: The date the subscription was last updated.
- **cxlNotes - string**: The notes associated with cancelling this appointment. Group_Concat'ed in case of multiple cancellations
- **subscriptionLink - string**: Subscription Link
- **poNumber - string**: Subscription poNumber
- **appointmentIDs - integer**: Every appointment attached to this subscription
- **completedAppointmentIDs - integer**: Every completed appointment attached to this subscription
- **initialAppointment - object**: The initial appointment object if includeInitialAppointments = true
- **recurringTicket - object**: The recurring ticket template associated with this subscription
- **addOns - string**: An array of Add-On objects associated with the INITIAL appointment.
- **leadID - integer**: Primary key for lead
- **leadDateAdded - string**: Time that this lead was created
- **leadUpdated - string**: Time that this lead was last updated
- **leadAddedBy - integer**: employeeID that created this lead
- **leadSourceID - integer**: Lead Source ID
- **leadSource - string**: Lead Source Description
- **leadStatus - integer**: Lead Status
- **leadStatusText - string**: Lead Status Text
- **leadStageID - integer**: Lead Stage ID
- **leadStage - string**: Lead Stage Description
- **leadAssignedTo - integer**: EmployeeID to whom the lead is assigned
- **leadDateAssigned - string**: Time the lead was assigned
- **leadValue - number**: Value of the lead
- **leadDateClosed - string**: Time the lead was closed
- **leadLostReason - string**: Lead Lost Reason ID
- **leadLostReasonText - string**: Lead Lost Reason
- **sourceID - integer**: Subscription Source ID
- **source - string**: Subscription Source Description
- **annualRecurringServices - integer**: Services per year without counting initial
- **unitIDs - integer**: An array of unit IDs available for this subscription (for multi unit customers) - defaults to all unless specific units have been selected
- **regionID - integer**: RegionID of the subscription
- **initialInvoice - string**: When the initial invoice should get generated. INITIAL_COMPLETION = when the initial service is completed. SIGNED_AGREEMENT = when the agreement is signed. INITIAL_BILLING_DATE = on a specified billing date.
- **initialBillingDate - string**: The date to generate initial invoice when initialInvoice = INITIAL_BILLING_DATE
- **renewalFrequency - integer**: How often a subscription is due for renewal.
- **renewalDate - string**: Next renewal date
- **customDate - string**: custom next appointment date
- **sentriconConnected - integer**: Set as 1 if the subscription is connected to sentricon
- **sentriconSiteID - string**: Sentricon Site ID or null if not connected to Sentricon
- **seasonalStart - string**: Date the season starts or 0000-00-00 if it is not a seasonal subscription
- **seasonalEnd - string**: Date the season ends or 0000-00-00 if it is not a seasonal subscription
- **nextBillingDate - string**: Next billing date for the subscription
- **maxMonthlyCharge - number**: Max monthly charge for the subscription
- **expirationDate - string**: Expiration Date for the subscription.
- **lastAppointment - string**: Last completed appointment associated with the subscription
- **templateType - string**: The template type associated with the service type
- **parentID - integer**: The subscriptionID of the service plan that the service round belongs to
- **duration - string**: Default duration of services in minutes
- **preferredDays - integer**: Empty String no preference, 0-Sunday, 1-Monday, 2-Tuesday, 3-Wednesday, 4-Thursday, 5-Friday, 6-Saturday
- **preferredStart - string**: Preferred appointment start time bound
- **preferredEnd - string**: Preferred appointment end time bound
- **callAhead - integer**: int in minutes
- **nextServicePlanRoundID - integer**: The servicePlanRoundID for this service round
- **servicePlanID - integer**: The serviceID of the service plan that this round belongs to
- **startDate - string**: Start date for this service round
- **endDate - string**: End date for this service round
- **prerequisiteServicePlanRoundID - integer**: The servicePlanRoundID of the prior round that this round is dependent on
- **daysAfterPrerequisite - integer**: Days to wait after the prior service round completed before starting this service round
- **maxDelay - integer**: Maximum number of days to wait before starting this service round
- **skipped - string**: The skip/omit status for the round
- **skipReasonID - integer**: The skip reason for MANUAL_SKIPPED rounds, defined in skipReasons table
- **dateSkipped - string**: The date that the skip status was changed

---

## /servicePlanRound/search

<a name="documentation_servicePlanRoundSearch"></a>

**Description:** Provide a set of parameters which will return a list of ids. There is no limit to the number of IDs this will return. You can then supply these ids to the `get` endpoint in order to retrieve bulk data. Every parameter available supports a simple value OR a powerful query object that gives you access to all basic comparators. 

Example: dateAdded={"operator":">","value":"2016-01-01"}

Example: dateAdded={"operator\":\"BETWEEN\",\"value\":[\"2016-05-12\",\"2016-05-13\"]}

Available operators: >, <, >=, <=, =, !=, IN, BETWEEN, LIKE, STARTSWITH, ENDSWITH, CONTAINS.

Each of the search endpoints allows for an optional parameter 'includeData'. When sent, the API will additionally send the resolved objects for the first 1000 IDs. Keep in mind when using 'includeData' that if there are more than 1000 items an additional property '{entity}IDsNoDataExported' will specify the items that are not included in the resolved data array.

### Parameters

- **officeIDs - integer**
- **active - integer**: Default: (0,1). 0: Frozen and no longer being placed in the job pool, 1: Active, -3: Lead
- **customerIDs - integer**: Customer who owns this subcscription
- **subscriptionIDs - integer**: Unique Identifier for this Subscription
- **soldBy - integer**: The user who is being credited for this sale. Used in stats and commissions reporting
- **preferredTech - integer**: The employee ID of the preferred tech
- **dateAdded - string**: Date this subscription was created / added / sold
- **dateCancelled - string**: Date this subscription was cancelled
- **dateUpdated - string**: Last date that something was changed on this subscription.
- **serviceType - integer**: The recurring service type to be scheduled for this subscription
- **serviceID - integer**: The recurring service type to be scheduled for this subscription
- **frequency - integer**: The service frequency of this subscription. >0: The number of days, if it is divisible by 30 it is the number of months, -3: Custom Schedule
- **dueDate - string**: When this subscription is due for their next service
- **lastCompleted - string**: When the last service was completed
- **dateUpdatedStart - string**
- **dateUpdatedEnd - string**
- **dateAddedStart - string**
- **dateAddedEnd - string**
- **contractIDs - integer**: The contract ID signed for the subscription
- **leadDateClosed - string**: The date the lead was closed
- **leadDateAssigned - string**: The date the lead was assigned
- **leadStageID - integer**: The stageID of the lead
- **leadAssignedTo - integer**: The employeeID the lead was assigned to
- **leadAddedBy - integer**: The employeeID who added the lead
- **leadDateAdded - string**: The date the lead was added
- **leadUpdated - string**: The date the lead was last updated
- **leadSourceID - integer**: The sourceID of the lead
- **sourceID - integer**: The sourceID of the subscription
- **nextService - string**: The date that the next service is due
- **regionID - integer**: RegionID of the subscription
- **lastRegularServiceDate - string**: Date for last service of subscription type
- **lastRegularServiceStatus - integer**: Last regular service status
- **sentriconConnected - integer**: Set as 1 if the subscription is connected to sentricon
- **sentriconSiteID - string**: Sentricon Site ID or null if not connected to Sentricon
- **nextBillingDate - string**: Next billing date for the subscription
- **parentID - integer**
- **templateType - string**: The template type associated with the service type
- **lastAppointment - string**: Last appointment of the subscription
- **description - string**: Service plan round description/abbreviation
- **startDate - string**: Date this service round can start being serviced
- **endDate - string**: Last date that this service round can be serviced
- **skipped - string**: The skip/omit status for the round
- **dateSkipped - string**: The date this round was skipped or omitted
- **includeData - integer**: {0,1} Sends the resolved objects for the first 1000 IDs. If there are more than 1000 items an additional property servicePlanRoundIDsNoDataExported will specify the items that are not included in the resolved servicePlanRound array.

### Response

- **servicePlanRoundIDs - array**

---

## /servicePlanRound/update

<a name="documentation_servicePlanRoundUpdate"></a>

**Description:** update a service plan round

### Parameters

- **subscriptionID - integer - required**: Primary key to the subscriptions table.
- **description - string**: Service plan round description/abbreviation
- **startDate - string**: Start date for this service round
- **endDate - string**: End date for this service round
- **daysAfterPrerequisite - integer**: Days to wait after the prior service round completed before starting this service round
- **maxDelay - integer**: Maximum number of days to wait before starting this service round
- **skipped - string**: The skip/omit status for the round
- **skipReasonID - integer**: The skip reason for MANUAL_SKIPPED rounds, defined in skipReasons table
- **skippedNotes - string**: The skip notes for MANUAL_SKIPPED rounds

---

## /serviceType/[id]

<a name="documentation_serviceTypeGetID"></a>

**Description:** Get serviceType data for single ID -- please provide a specific record ID in the URL structure.

### Parameters

- **-**

### Response

- **typeID - integer**: Unique Identifier
- **officeID - integer**: Office ID this service type belongs to, it will be -1 if it is a Global service type
- **description - string**: Service type description
- **frequency - integer**: Service Type Frequecy. (-1 when it is As need, 0 when it is One Time, -3 when it is Custom Schedule)
- **defaultCharge - number**: Service type default charge
- **category - string**: Service type category
- **reservice - integer**: Service is a reservice type
- **defaultLength - integer**: Default appointment duration in minutes
- **defaultInitialCharge - number**: Service defaultInitialCharge. If this is not set, the office default initial quote is sent instead.
- **initialID - integer**: Initial service type, or 0 if one is not set.
- **minimumRecurringCharge - number**: Minimum recurring charge for subscriptions.
- **minimumInitialCharge - number**: Minimum initial charge for subscriptions.
- **regularService - integer**: Set as 1 if the service type is marked as a regular service.
- **initial - integer**: Set as 1 if the service type is marked as an initial service.
- **seasonStart - string**: Season Start Date for this service
- **seasonEnd - string**: Season End Date for this service
- **glAccountID - integer**: glAccountID of the service
- **sentricon - integer**: Sentricon service type (reports to Sentricon Web Services when completed)
- **visible - integer**: 1 if visible, 0 if hidden.

---

## /serviceType/get

<a name="documentation_serviceTypeGetBulk"></a>

**Description:** Get Bulk data for serviceType. Accepts an array of typeIDs. Returns a max of 1000 records.

### Parameters

- **typeIDs - array**

### Response

- **typeID - integer**: Unique Identifier
- **officeID - integer**: Office ID this service type belongs to, it will be -1 if it is a Global service type
- **description - string**: Service type description
- **frequency - integer**: Service Type Frequecy. (-1 when it is As need, 0 when it is One Time, -3 when it is Custom Schedule)
- **defaultCharge - number**: Service type default charge
- **category - string**: Service type category
- **reservice - integer**: Service is a reservice type
- **defaultLength - integer**: Default appointment duration in minutes
- **defaultInitialCharge - number**: Service defaultInitialCharge. If this is not set, the office default initial quote is sent instead.
- **initialID - integer**: Initial service type, or 0 if one is not set.
- **minimumRecurringCharge - number**: Minimum recurring charge for subscriptions.
- **minimumInitialCharge - number**: Minimum initial charge for subscriptions.
- **regularService - integer**: Set as 1 if the service type is marked as a regular service.
- **initial - integer**: Set as 1 if the service type is marked as an initial service.
- **seasonStart - string**: Season Start Date for this service
- **seasonEnd - string**: Season End Date for this service
- **glAccountID - integer**: glAccountID of the service
- **sentricon - integer**: Sentricon service type (reports to Sentricon Web Services when completed)
- **visible - integer**: 1 if visible, 0 if hidden.

---

## /serviceType/search

<a name="documentation_serviceTypeSearch"></a>

**Description:** Provide a set of parameters which will return a list of ids. There is no limit to the number of IDs this will return. You can then supply these ids to the `get` endpoint in order to retrieve bulk data. Every parameter available supports a simple value OR a powerful query object that gives you access to all basic comparators. 

Example: dateAdded={"operator":">","value":"2016-01-01"}

Example: dateAdded={"operator\":\"BETWEEN\",\"value\":[\"2016-05-12\",\"2016-05-13\"]}

Available operators: >, <, >=, <=, =, !=, IN, BETWEEN, LIKE, STARTSWITH, ENDSWITH, CONTAINS.

Each of the search endpoints allows for an optional parameter 'includeData'. When sent, the API will additionally send the resolved objects for the first 1000 IDs. Keep in mind when using 'includeData' that if there are more than 1000 items an additional property '{entity}IDsNoDataExported' will specify the items that are not included in the resolved data array.

### Parameters

- **officeIDs - integer**: Office Unique Identifier
- **typeIDs - integer**: Service Type Unique Identifier
- **description - string**: Description of the Service Type
- **category - string**: Category of the Service Type
- **reservice - integer**: Service is a reservice type
- **sentricon - integer**: Service is a sentricon service type
- **includeData - integer**: {0,1} Sends the resolved objects for the first 1000 IDs. If there are more than 1000 items an additional property serviceTypeIDsNoDataExported will specify the items that are not included in the resolved serviceType array.

### Response

- **serviceTypeIDs - array**

---

## /skill/[id]

<a name="documentation_skillGetID"></a>

**Description:** Get skill data for single ID -- please provide a specific record ID in the URL structure.

### Parameters

- **-**

### Response

- **skillID - integer**
- **name - string**
- **officeID - integer**
- **visible - integer**
- **serviceIDs - integer**: IDs of serviceTypes associated with the skill
- **productIDs - integer**: IDs of addOns associated with the skill

---

## /skill/create

<a name="documentation_skillCreate"></a>

**Description:** create a skill

### Parameters

- **name - string - required**: Name of skill
- **officeID - integer - required**: officeID this skill is specific to, or -1 to be available to all offices
- **visible - integer - required**: Skill visibility: 1 = visible, 0 = hidden
- **serviceIDs - string**: Array of serviceType IDs the skill should be for
- **productIDs - string**: Array of productIDs the skill should be for

---

## /skill/get

<a name="documentation_skillGetBulk"></a>

**Description:** Get Bulk data for skill. Accepts an array of skillIDs. Returns a max of 1000 records.

### Parameters

- **skillIDs - array**

### Response

- **skillID - integer**
- **name - string**
- **officeID - integer**
- **visible - integer**
- **serviceIDs - integer**: IDs of serviceTypes associated with the skill
- **productIDs - integer**: IDs of addOns associated with the skill

---

## /skill/search

<a name="documentation_skillSearch"></a>

**Description:** Provide a set of parameters which will return a list of ids. There is no limit to the number of IDs this will return. You can then supply these ids to the `get` endpoint in order to retrieve bulk data. Every parameter available supports a simple value OR a powerful query object that gives you access to all basic comparators. 

Example: dateAdded={"operator":">","value":"2016-01-01"}

Example: dateAdded={"operator\":\"BETWEEN\",\"value\":[\"2016-05-12\",\"2016-05-13\"]}

Available operators: >, <, >=, <=, =, !=, IN, BETWEEN, LIKE, STARTSWITH, ENDSWITH, CONTAINS.

Each of the search endpoints allows for an optional parameter 'includeData'. When sent, the API will additionally send the resolved objects for the first 1000 IDs. Keep in mind when using 'includeData' that if there are more than 1000 items an additional property '{entity}IDsNoDataExported' will specify the items that are not included in the resolved data array.

### Parameters

- **skillIDs - integer**: Primary key
- **skillID - integer**: Primary key alias
- **officeIDs - integer**: Office ID skill belongs to
- **includeData - integer**: {0,1} Sends the resolved objects for the first 1000 IDs. If there are more than 1000 items an additional property skillIDsNoDataExported will specify the items that are not included in the resolved skill array.

### Response

- **skillIDs - array**

---

## /skill/update

<a name="documentation_skillUpdate"></a>

**Description:** Update skill details

### Parameters

- **name - string**: Name of skill
- **officeID - integer**: officeID this skill is specific to, or -1 to be available to all offices
- **visible - integer**: Skill visibility: 1 = visible, 0 = hidden
- **serviceIDs - string**: Array of serviceType IDs the skill should be for
- **productIDs - string**: Array of productIDs the skill should be for
- **skillID - integer - required**: Primary key to the skills table.

---

## /spot/[id]

<a name="documentation_spotGetID"></a>

**Description:** Get spot data for single ID -- please provide a specific record ID in the URL structure.
 This function has additional non-standard filters Latitude and Longitude for distance calculation. If these are not specified the office location will be used.

### Parameters

- **latitude - number**: Latitude for distance calculcations. If not specified, the office longitude will be used
- **longitude - number**: Longitude for distance calculcations. If not specified, the office longitude will be used
- **maxDistance - integer**: Maximum number of miles from the previous spot to return.
- **ignoreInitialDriveTime - integer**: If sent as 1 the start and end of the route will be ignored for distanceToClosest and maxDistance once the route has an appointment on it. This strategy can be beneficial technicians are driving a long distance to their first appointment, then servicing locally from there.
- **open - integer**: Set as 1 to return only open routes from the GET

### Response

- **spotID - integer**
- **routeID - integer**
- **date - string**
- **start - string**
- **end - string**
- **spotCapacity - integer**
- **description - string**
- **currentAppointment - integer**
- **currentAppointmentDuration - integer**
- **blockReason - string**
- **distanceToPrevious - number**
- **previousLat - number**
- **previousLng - number**
- **prevCustomer - integer**: ID of the customer occupying the next appointment
- **prevSpotID - integer**: ID of the last occupied spot
- **prevAppointmentID - integer**: ID of the last appointment
- **distanceToNext - number**
- **nextLat - number**
- **nextLng - number**
- **nextCustomer - integer**: ID of the customer occupying the next filled appointment
- **nextSpotID - integer**: ID of the next occupied spot
- **nextAppointmentID - integer**: ID of the next appointment
- **apiCanSchedule - integer**: 1 when the API can schedule to this spot
- **assignedTech - integer**: EmployeeID assigned to the route.
- **reserved - integer**: True if the appointment has been reserved by an API user.
- **reservationEnd - string**: The time that the reservation on this spot will expire.

---

## /spot/block

<a name="documentation_spotBlock"></a>

**Description:** Block spots

### Parameters

- **spotID - integer**: Foreign key to spots table
- **spotIDs - array**: Array of additional spotIDs to block
- **description - array**: Block description default: Break

---

## /spot/get

<a name="documentation_spotGetBulk"></a>

**Description:** Get Bulk data for spot. Accepts an array of spotIDs. Returns a max of 1000 records.
 This function has additional non-standard filters Latitude and Longitude for distance calculation. If these are not specified the office location will be used.

### Parameters

- **spotIDs - array**
- **latitude - number**: Latitude for distance calculcations. If not specified, the office longitude will be used
- **longitude - number**: Longitude for distance calculcations. If not specified, the office longitude will be used
- **maxDistance - int**: Maximum number of miles from the previous spot to return.
- **ignoreInitialDriveTime - int**: If sent as 1 the start and end of the route will be ignored for distanceToClosest and maxDistance once the route has an appointment on it. This strategy can be beneficial technicians are driving a long distance to their first appointment, then servicing locally from there.
- **open - int**: Set as 1 to return only open routes from the GET

### Response

- **spotID - integer**
- **routeID - integer**
- **date - string**
- **start - string**
- **end - string**
- **spotCapacity - integer**
- **description - string**
- **currentAppointment - integer**
- **currentAppointmentDuration - integer**
- **blockReason - string**
- **distanceToPrevious - number**
- **previousLat - number**
- **previousLng - number**
- **prevCustomer - integer**: ID of the customer occupying the next appointment
- **prevSpotID - integer**: ID of the last occupied spot
- **prevAppointmentID - integer**: ID of the last appointment
- **distanceToNext - number**
- **nextLat - number**
- **nextLng - number**
- **nextCustomer - integer**: ID of the customer occupying the next filled appointment
- **nextSpotID - integer**: ID of the next occupied spot
- **nextAppointmentID - integer**: ID of the next appointment
- **apiCanSchedule - integer**: 1 when the API can schedule to this spot
- **assignedTech - integer**: EmployeeID assigned to the route.
- **reserved - integer**: True if the appointment has been reserved by an API user.
- **reservationEnd - string**: The time that the reservation on this spot will expire.

---

## /spot/release

<a name="documentation_spotRelease"></a>

**Description:** Release reservations on a spot

### Parameters

- **spotID - integer**: Foreign key to spots table

---

## /spot/reserve

<a name="documentation_spotReserve"></a>

**Description:** Reserve a spot until a particular time

### Parameters

- **spotID - integer**: Foreign key to spots table
- **spotOptions - array**: Array of spotIDs. If sent, the first available spotID in this set will be reserved
- **duration - integer - required**: duration of the lock in minutes

---

## /spot/search

<a name="documentation_spotSearch"></a>

**Description:** Provide a set of parameters which will return a list of ids. There is no limit to the number of IDs this will return. You can then supply these ids to the `get` endpoint in order to retrieve bulk data. Every parameter available supports a simple value OR a powerful query object that gives you access to all basic comparators. 

Example: dateAdded={"operator":">","value":"2016-01-01"}

Example: dateAdded={"operator\":\"BETWEEN\",\"value\":[\"2016-05-12\",\"2016-05-13\"]}

Available operators: >, <, >=, <=, =, !=, IN, BETWEEN, LIKE, STARTSWITH, ENDSWITH, CONTAINS.

Each of the search endpoints allows for an optional parameter 'includeData'. When sent, the API will additionally send the resolved objects for the first 1000 IDs. Keep in mind when using 'includeData' that if there are more than 1000 items an additional property '{entity}IDsNoDataExported' will specify the items that are not included in the resolved data array.
 If the includeData flag is set the additional parameters from getData (latitude, longitude, and maxDistance) can be used.

### Parameters

- **officeIDs - integer**
- **spotIDs - integer**: Primary key for spots.
- **date - string**
- **apiCanSchedule - boolean**: Send as 1 to retrieve only routes that the API can schedule for.
- **assignedTech - integer**
- **routeID - integer**: Primary key for routes.
- **routeIDs - integer**: Primary key for routes.
- **reserved - integer**: Primary key for routes.
- **dateUpdated - string**: Date of last update.
- **includeData - integer**: {0,1} Sends the resolved objects for the first 1000 IDs. If there are more than 1000 items an additional property spotIDsNoDataExported will specify the items that are not included in the resolved spot array.

### Response

- **spotIDs - array**

---

## /spot/unblock

<a name="documentation_spotUnblock"></a>

**Description:** unblock spots

### Parameters

- **spotID - integer**: Foreign key to spots table
- **spotIDs - array**: Array of additional spotIDs to unblock

---

## /subscription/[id]

<a name="documentation_subscriptionGetID"></a>

**Description:** Get subscription data for single ID -- please provide a specific record ID in the URL structure.

### Parameters

- **includeCancellationReason - integer**: Send as 1 to retrieve an array of cancellationNotes associated with the subscription.

### Response

- **subscriptionID - integer**: Unique ID
- **customerID - integer**: Customer ID which this subscription belongs to
- **billToAccountID - integer**: Billing Account which this subscription belongs to
- **officeID - integer**: Office ID which this subscription belongs to
- **dateAdded - string**: Date this subscription was added / created. Sold date.
- **contractAdded - string**: Date the last contract was added / created.
- **active - integer**: 0: frozen, 1: active and being placed in the job pool.
- **activeText - integer**: Friendly text version of active
- **initialQuote - number**: The retail quoted price for the initial service on this subscription.
- **initialDiscount - number**: The discount to be applied to the initial service
- **initialServiceTotal - number**: The net amount of initialQuote-initialDiscount. DOES NOT INCLUDE add-ons
- **yifDiscount - number**: The discount provided if paying for a year in advance
- **recurringCharge - number**: A shortcut for the subtotal of the recurring ticket
- **contractValue - number**: Calculated as the initial total + the number of recurring services*recurringCharge. There are some tweaks available for different companies / preferences, particularly when dealing with recurring billing.
- **annualRecurringValue - number**: Calculated as the recurringCharge * the number of services/year.
- **billingFrequency - integer**: How often this subscription gets their invoice generated -- can be seperate from when their service takes place. 0 / -1 represents getting billed after each service.
- **frequency - integer**: The frequency that the services get scheduled. -1 represents One-Time, 0 represents 'as needed'. Greater than 0 represents the frequency in days. If it is divisible by 30, it is converted to months -- so 90 would represent 3 months and not necessarily 90 days.
- **followupService - integer**: How many days after the initial service to schedule the first recurring service.
- **agreementLength - number**: Agreement Length
- **nextService - string**: When the next service is due.
- **lastCompleted - string**: When the last service was completed
- **serviceID - integer**: The service type ID for the regular recurring services
- **serviceType - string**: Friendly description of the serviceID
- **soldBy - integer**: The employee ID who gets credit for this sale. Defaults to the user who added the subscription
- **soldBy2 - integer**: Additional employeeID that gets credit for this sale
- **soldBy3 - integer**: Additional employeeID that gets credit for this sale
- **preferredTech - integer**: preferred tech ID
- **addedBy - integer**: The employee ID that added the subscription
- **initialAppointmentID - integer**: The initial service appointment ID
- **initialStatus - integer**: A shortcut for the status of the initial appointment
- **initialStatusText - string**: Friendly text version of the initialStatus
- **dateCancelled - string**: The date the subscription was cancelled if any.
- **dateUpdated - string**: The date the subscription was last updated.
- **cxlNotes - string**: The notes associated with cancelling this appointment. Group_Concat'ed in case of multiple cancellations
- **subscriptionLink - string**: Subscription Link
- **poNumber - string**: Subscription poNumber
- **appointmentIDs - integer**: Every appointment attached to this subscription
- **completedAppointmentIDs - integer**: Every completed appointment attached to this subscription
- **initialAppointment - object**: The initial appointment object if includeInitialAppointments = true
- **recurringTicket - object**: The recurring ticket template associated with this subscription
- **addOns - string**: An array of Add-On objects associated with the INITIAL appointment.
- **leadID - integer**: Primary key for lead
- **leadDateAdded - string**: Time that this lead was created
- **leadUpdated - string**: Time that this lead was last updated
- **leadAddedBy - integer**: employeeID that created this lead
- **leadSourceID - integer**: Lead Source ID
- **leadSource - string**: Lead Source Description
- **leadStatus - integer**: Lead Status
- **leadStatusText - string**: Lead Status Text
- **leadStageID - integer**: Lead Stage ID
- **leadStage - string**: Lead Stage Description
- **leadAssignedTo - integer**: EmployeeID to whom the lead is assigned
- **leadDateAssigned - string**: Time the lead was assigned
- **leadValue - number**: Value of the lead
- **leadDateClosed - string**: Time the lead was closed
- **leadLostReason - string**: Lead Lost Reason ID
- **leadLostReasonText - string**: Lead Lost Reason
- **sourceID - integer**: Subscription Source ID
- **source - string**: Subscription Source Description
- **annualRecurringServices - integer**: Services per year without counting initial
- **unitIDs - integer**: An array of unit IDs available for this subscription (for multi unit customers) - defaults to all unless specific units have been selected
- **regionID - integer**: RegionID of the subscription
- **initialInvoice - string**: When the initial invoice should get generated. INITIAL_COMPLETION = when the initial service is completed. SIGNED_AGREEMENT = when the agreement is signed. INITIAL_BILLING_DATE = on a specified billing date.
- **initialBillingDate - string**: The date to generate initial invoice when initialInvoice = INITIAL_BILLING_DATE
- **renewalFrequency - integer**: How often a subscription is due for renewal.
- **renewalDate - string**: Next renewal date
- **customDate - string**: custom next appointment date
- **sentriconConnected - integer**: Set as 1 if the subscription is connected to sentricon
- **sentriconSiteID - string**: Sentricon Site ID or null if not connected to Sentricon
- **seasonalStart - string**: Date the season starts or 0000-00-00 if it is not a seasonal subscription
- **seasonalEnd - string**: Date the season ends or 0000-00-00 if it is not a seasonal subscription
- **nextBillingDate - string**: Next billing date for the subscription
- **maxMonthlyCharge - number**: Max monthly charge for the subscription
- **expirationDate - string**: Expiration Date for the subscription.
- **lastAppointment - string**: Last completed appointment associated with the subscription
- **templateType - string**: The template type associated with the service type
- **parentID - integer**: The subscriptionID of the service plan that the service round belongs to
- **duration - string**: Default duration of services in minutes
- **preferredDays - integer**: Empty String no preference, 0-Sunday, 1-Monday, 2-Tuesday, 3-Wednesday, 4-Thursday, 5-Friday, 6-Saturday
- **preferredStart - string**: Preferred appointment start time bound
- **preferredEnd - string**: Preferred appointment end time bound
- **callAhead - integer**: int in minutes

---

## /subscription/create

<a name="documentation_subscriptionCreate"></a>

**Description:** create a subscription

### Parameters

- **subscriptionLink - string**: Subscription Link for import
- **serviceID - integer - required**: The service type ID for the regular recurring services
- **customerID - integer - required**: Customer ID which this subscription belongs to
- **billToAccountID - integer**: Billing Account which this subscription belongs to
- **active - integer**: 0: frozen, 1: active and being placed in the job pool.
- **billingFrequency - integer**: Frequency that an invoice is generated for this service. -1/0
- **frequency - integer**: The frequency that the services get scheduled. -1 represents One-Time, 0 represents 'as needed'. Greater than 0 represents the frequency in days. If it is divisible by 30, it is converted to months -- so 90 would represent 3 months and not necessarily 90 days.
- **seasonalStart - string**: Seasonal Start
- **seasonalEnd - string**: Seasonal End
- **followupDelay - integer**: How many days after the initial service to schedule the first recurring service. Set as -1 to use frequency
- **agreementLength - integer**: Agreement Length
- **preferredTech - integer**: The employee ID of the preferred tech - 0 for no preference
- **preferredDays - integer**: Preferred appointment day (0-SUN, 1-MON, 2-TUE, 3-WED, 4-THU, 5-FRI, 6-SAT)
- **preferredStart - string**: Preferred appointment start time window in local time e.g. 00:00:00
- **preferredEnd - string**: Preferred appointment end time window in local time e.g. 14:30:00
- **sourceID - integer**: Subscription Source ID
- **regionID - integer**: RegionID of the subscription
- **renewalFrequency - integer**: How often a subscription is due for renewal.
- **renewalDate - string**: Next renewal date
- **customDate - string**: Custom next appointment date for the subscription.
- **customScheduleID - integer**: ID of a pre-defined custom-schedule for services. frequency will be set to -3.
- **nextBillingDate - string**: Next billing date for the subscription
- **duration - integer**: The default duration in minutes for the appointment. Set to -1 to inherit from the service type.
- **leadValue - number**: Value of the lead
- **expirationDate - integer**: Expiration date of the subscription
- **addedBy - integer**: The employee ID that added the subscription
- **dateCancelled - string**: Date the subscription was cancelled
- **billingTermsDays - integer**: Net Billing Days
- **poNumber - string**: subscription poNumber
- **callAhead - integer**: int in minutes
- **soldBy - integer**: The employee ID who gets credit for this sale. Defaults to the user who added the subscription
- **soldBy2 - integer**: Additional employeeID that gets credit for this sale
- **soldBy3 - integer**: Additional employeeID that gets credit for this sale
- **convertToLead - integer**: Automatically convert the subscription to a lead following the request
- **serviceCharge - integer**: Amount that will be charged each service. To edit this after create use ticket/update with the subscriptionID and templateType=R
- **addons - object**: Array of ticket addon objects, see ticket/createAddon for parameters. To edit this after create use ticket/update with the subscriptionID and templateType=R
- **initialCharge - integer**: Amount that will be charged on the initial service. To edit this after create use ticket/update with the subscriptionID and templateType=I
- **initialAddons - object**: Array of ticket addon objects, see ticket/createAddon for parameters. To edit this after create use ticket/update with the subscriptionID and templateType=I
- **initialInvoice - string**: When the initial invoice should get generated. INITIAL_COMPLETION = when the initial service is completed. SIGNED_AGREEMENT = when the agreement is signed. INITIAL_BILLING_DATE = on a specified billing date.

---

## /subscription/createInitialAddOn

<a name="documentation_subscriptionCreateInitialAddOn"></a>

### Parameters

- **subscriptionID - integer - required**: Foreign key to subscriptions table.
- **productID - integer - required**: Foreign key to products table.
- **serviceID - integer**: Foreign key to serviceTypes table.
- **amount - number - required**: Amount to charge for this addon.
- **quantity - integer**: The number of items. Defaults to 1.
- **taxable - integer**: 1- tax 0 - no tax; Defaults to the value specified for serviceTaxable on initial ticket.
- **creditTo - integer**: The employee who will receive credit for selling the add-on for commissions. Defaults to creditTo on Service Subscription.
- **description - string**: Customer facing text for item.

---

## /subscription/delete

<a name="documentation_subscriptionDelete"></a>

### Parameters

- **subscriptionID - integer - required**: Primary key to subscriptions table.

---

## /subscription/deleteInitialAddOn

<a name="documentation_subscriptionDeleteInitialAddOn"></a>

### Parameters

- **subscriptionID - integer - required**: Foreign key to subscriptions table.
- **addOnID - integer - required**: Foreign key to initialAddons table.

---

## /subscription/get

<a name="documentation_subscriptionGetBulk"></a>

**Description:** Get Bulk data for subscription. Accepts an array of subscriptionIDs. Returns a max of 1000 records.

### Parameters

- **subscriptionIDs - array**
- **includeCancellationReason - int**: Send as 1 to retrieve an array of cancellationNotes associated with the subscription.

### Response

- **subscriptionID - integer**: Unique ID
- **customerID - integer**: Customer ID which this subscription belongs to
- **billToAccountID - integer**: Billing Account which this subscription belongs to
- **officeID - integer**: Office ID which this subscription belongs to
- **dateAdded - string**: Date this subscription was added / created. Sold date.
- **contractAdded - string**: Date the last contract was added / created.
- **active - integer**: 0: frozen, 1: active and being placed in the job pool.
- **activeText - integer**: Friendly text version of active
- **initialQuote - number**: The retail quoted price for the initial service on this subscription.
- **initialDiscount - number**: The discount to be applied to the initial service
- **initialServiceTotal - number**: The net amount of initialQuote-initialDiscount. DOES NOT INCLUDE add-ons
- **yifDiscount - number**: The discount provided if paying for a year in advance
- **recurringCharge - number**: A shortcut for the subtotal of the recurring ticket
- **contractValue - number**: Calculated as the initial total + the number of recurring services*recurringCharge. There are some tweaks available for different companies / preferences, particularly when dealing with recurring billing.
- **annualRecurringValue - number**: Calculated as the recurringCharge * the number of services/year.
- **billingFrequency - integer**: How often this subscription gets their invoice generated -- can be seperate from when their service takes place. 0 / -1 represents getting billed after each service.
- **frequency - integer**: The frequency that the services get scheduled. -1 represents One-Time, 0 represents 'as needed'. Greater than 0 represents the frequency in days. If it is divisible by 30, it is converted to months -- so 90 would represent 3 months and not necessarily 90 days.
- **followupService - integer**: How many days after the initial service to schedule the first recurring service.
- **agreementLength - number**: Agreement Length
- **nextService - string**: When the next service is due.
- **lastCompleted - string**: When the last service was completed
- **serviceID - integer**: The service type ID for the regular recurring services
- **serviceType - string**: Friendly description of the serviceID
- **soldBy - integer**: The employee ID who gets credit for this sale. Defaults to the user who added the subscription
- **soldBy2 - integer**: Additional employeeID that gets credit for this sale
- **soldBy3 - integer**: Additional employeeID that gets credit for this sale
- **preferredTech - integer**: preferred tech ID
- **addedBy - integer**: The employee ID that added the subscription
- **initialAppointmentID - integer**: The initial service appointment ID
- **initialStatus - integer**: A shortcut for the status of the initial appointment
- **initialStatusText - string**: Friendly text version of the initialStatus
- **dateCancelled - string**: The date the subscription was cancelled if any.
- **dateUpdated - string**: The date the subscription was last updated.
- **cxlNotes - string**: The notes associated with cancelling this appointment. Group_Concat'ed in case of multiple cancellations
- **subscriptionLink - string**: Subscription Link
- **poNumber - string**: Subscription poNumber
- **appointmentIDs - integer**: Every appointment attached to this subscription
- **completedAppointmentIDs - integer**: Every completed appointment attached to this subscription
- **initialAppointment - object**: The initial appointment object if includeInitialAppointments = true
- **recurringTicket - object**: The recurring ticket template associated with this subscription
- **addOns - string**: An array of Add-On objects associated with the INITIAL appointment.
- **leadID - integer**: Primary key for lead
- **leadDateAdded - string**: Time that this lead was created
- **leadUpdated - string**: Time that this lead was last updated
- **leadAddedBy - integer**: employeeID that created this lead
- **leadSourceID - integer**: Lead Source ID
- **leadSource - string**: Lead Source Description
- **leadStatus - integer**: Lead Status
- **leadStatusText - string**: Lead Status Text
- **leadStageID - integer**: Lead Stage ID
- **leadStage - string**: Lead Stage Description
- **leadAssignedTo - integer**: EmployeeID to whom the lead is assigned
- **leadDateAssigned - string**: Time the lead was assigned
- **leadValue - number**: Value of the lead
- **leadDateClosed - string**: Time the lead was closed
- **leadLostReason - string**: Lead Lost Reason ID
- **leadLostReasonText - string**: Lead Lost Reason
- **sourceID - integer**: Subscription Source ID
- **source - string**: Subscription Source Description
- **annualRecurringServices - integer**: Services per year without counting initial
- **unitIDs - integer**: An array of unit IDs available for this subscription (for multi unit customers) - defaults to all unless specific units have been selected
- **regionID - integer**: RegionID of the subscription
- **initialInvoice - string**: When the initial invoice should get generated. INITIAL_COMPLETION = when the initial service is completed. SIGNED_AGREEMENT = when the agreement is signed. INITIAL_BILLING_DATE = on a specified billing date.
- **initialBillingDate - string**: The date to generate initial invoice when initialInvoice = INITIAL_BILLING_DATE
- **renewalFrequency - integer**: How often a subscription is due for renewal.
- **renewalDate - string**: Next renewal date
- **customDate - string**: custom next appointment date
- **sentriconConnected - integer**: Set as 1 if the subscription is connected to sentricon
- **sentriconSiteID - string**: Sentricon Site ID or null if not connected to Sentricon
- **seasonalStart - string**: Date the season starts or 0000-00-00 if it is not a seasonal subscription
- **seasonalEnd - string**: Date the season ends or 0000-00-00 if it is not a seasonal subscription
- **nextBillingDate - string**: Next billing date for the subscription
- **maxMonthlyCharge - number**: Max monthly charge for the subscription
- **expirationDate - string**: Expiration Date for the subscription.
- **lastAppointment - string**: Last completed appointment associated with the subscription
- **templateType - string**: The template type associated with the service type
- **parentID - integer**: The subscriptionID of the service plan that the service round belongs to
- **duration - string**: Default duration of services in minutes
- **preferredDays - integer**: Empty String no preference, 0-Sunday, 1-Monday, 2-Tuesday, 3-Wednesday, 4-Thursday, 5-Friday, 6-Saturday
- **preferredStart - string**: Preferred appointment start time bound
- **preferredEnd - string**: Preferred appointment end time bound
- **callAhead - integer**: int in minutes

---

## /subscription/getInitialAddOns

<a name="documentation_subscriptionGetInitialAddOns"></a>

### Parameters

- **subscriptionID - integer - required**: Foreign key to subscriptions table.

### Response

- **addOnID - integer**: Primary Key ticketItems.itemID
- **subscriptionID - integer**: Foreign key to subscriptions table.
- **productID - integer**: Foreign key to products table.
- **amount - number**: Amount to charge for this addon.
- **description - string**: Friendly description of the product.
- **quantity - integer**: The number of items.
- **taxable - integer**: 1- tax 0 - no tax
- **creditTo - integer**: Employee who sold the add-on

---

## /subscription/search

<a name="documentation_subscriptionSearch"></a>

**Description:** Provide a set of parameters which will return a list of ids. There is no limit to the number of IDs this will return. You can then supply these ids to the `get` endpoint in order to retrieve bulk data. Every parameter available supports a simple value OR a powerful query object that gives you access to all basic comparators. 

Example: dateAdded={"operator":">","value":"2016-01-01"}

Example: dateAdded={"operator\":\"BETWEEN\",\"value\":[\"2016-05-12\",\"2016-05-13\"]}

Available operators: >, <, >=, <=, =, !=, IN, BETWEEN, LIKE, STARTSWITH, ENDSWITH, CONTAINS.

Each of the search endpoints allows for an optional parameter 'includeData'. When sent, the API will additionally send the resolved objects for the first 1000 IDs. Keep in mind when using 'includeData' that if there are more than 1000 items an additional property '{entity}IDsNoDataExported' will specify the items that are not included in the resolved data array.

### Parameters

- **officeIDs - integer**
- **active - integer**: Default: (0,1). 0: Frozen and no longer being placed in the job pool, 1: Active, -3: Lead
- **customerIDs - integer**: Customer who owns this subcscription
- **subscriptionIDs - integer**: Unique Identifier for this Subscription
- **soldBy - integer**: The user who is being credited for this sale. Used in stats and commissions reporting
- **preferredTech - integer**: The employee ID of the preferred tech
- **dateAdded - string**: Date this subscription was created / added / sold
- **dateCancelled - string**: Date this subscription was cancelled
- **dateUpdated - string**: Last date that something was changed on this subscription.
- **serviceType - integer**: The recurring service type to be scheduled for this subscription
- **serviceID - integer**: The recurring service type to be scheduled for this subscription
- **frequency - integer**: The service frequency of this subscription. >0: The number of days, if it is divisible by 30 it is the number of months, -3: Custom Schedule
- **dueDate - string**: When this subscription is due for their next service
- **lastCompleted - string**: When the last service was completed
- **dateUpdatedStart - string**
- **dateUpdatedEnd - string**
- **dateAddedStart - string**
- **dateAddedEnd - string**
- **contractIDs - integer**: The contract ID signed for the subscription
- **leadDateClosed - string**: The date the lead was closed
- **leadDateAssigned - string**: The date the lead was assigned
- **leadStageID - integer**: The stageID of the lead
- **leadAssignedTo - integer**: The employeeID the lead was assigned to
- **leadAddedBy - integer**: The employeeID who added the lead
- **leadDateAdded - string**: The date the lead was added
- **leadUpdated - string**: The date the lead was last updated
- **leadSourceID - integer**: The sourceID of the lead
- **sourceID - integer**: The sourceID of the subscription
- **nextService - string**: The date that the next service is due
- **regionID - integer**: RegionID of the subscription
- **lastRegularServiceDate - string**: Date for last service of subscription type
- **lastRegularServiceStatus - integer**: Last regular service status
- **sentriconConnected - integer**: Set as 1 if the subscription is connected to sentricon
- **sentriconSiteID - string**: Sentricon Site ID or null if not connected to Sentricon
- **nextBillingDate - string**: Next billing date for the subscription
- **parentID - integer**
- **templateType - string**: The template type associated with the service type
- **lastAppointment - string**: Last appointment of the subscription
- **includeData - integer**: {0,1} Sends the resolved objects for the first 1000 IDs. If there are more than 1000 items an additional property subscriptionIDsNoDataExported will specify the items that are not included in the resolved subscription array.

### Response

- **subscriptionIDs - array**

---

## /subscription/setInitialAddOns

<a name="documentation_subscriptionSetInitialAddOns"></a>

### Parameters

- **subscriptionID - integer - required**: Foreign key to subscriptions table.
- **addons - array**: Addon Entity - see createInitialAddOn params

---

## /subscription/update

<a name="documentation_subscriptionUpdate"></a>

**Description:** Update subscription details

### Parameters

- **subscriptionLink - string**: Subscription Link for import
- **serviceID - integer**: The service type ID for the regular recurring services
- **customerID - integer**: Customer ID which this subscription belongs to
- **billToAccountID - integer**: Billing Account which this subscription belongs to
- **active - integer**: 0: frozen, 1: active and being placed in the job pool.
- **billingFrequency - integer**: Frequency that an invoice is generated for this service. -1/0
- **frequency - integer**: The frequency that the services get scheduled. -1 represents One-Time, 0 represents 'as needed'. Greater than 0 represents the frequency in days. If it is divisible by 30, it is converted to months -- so 90 would represent 3 months and not necessarily 90 days.
- **seasonalStart - string**: Seasonal Start
- **seasonalEnd - string**: Seasonal End
- **followupDelay - integer**: How many days after the initial service to schedule the first recurring service. Set as -1 to use frequency
- **agreementLength - integer**: Agreement Length
- **preferredTech - integer**: The employee ID of the preferred tech - 0 for no preference
- **preferredDays - integer**: Preferred appointment day (0-SUN, 1-MON, 2-TUE, 3-WED, 4-THU, 5-FRI, 6-SAT)
- **preferredStart - string**: Preferred appointment start time window in local time e.g. 00:00:00
- **preferredEnd - string**: Preferred appointment end time window in local time e.g. 14:30:00
- **sourceID - integer**: Subscription Source ID
- **regionID - integer**: RegionID of the subscription
- **renewalFrequency - integer**: How often a subscription is due for renewal.
- **renewalDate - string**: Next renewal date
- **customDate - string**: Custom next appointment date for the subscription.
- **customScheduleID - integer**: ID of a pre-defined custom-schedule for services. frequency will be set to -3.
- **nextBillingDate - string**: Next billing date for the subscription
- **duration - integer**: The default duration in minutes for the appointment. Set to -1 to inherit from the service type.
- **leadValue - number**: Value of the lead
- **expirationDate - integer**: Expiration date of the subscription
- **addedBy - integer**: The employee ID that added the subscription
- **dateCancelled - string**: Date the subscription was cancelled
- **billingTermsDays - integer**: Net Billing Days
- **poNumber - string**: subscription poNumber
- **callAhead - integer**: int in minutes
- **soldBy - integer**: The employee ID who gets credit for this sale. Defaults to the user who added the subscription
- **soldBy2 - integer**: Additional employeeID that gets credit for this sale
- **soldBy3 - integer**: Additional employeeID that gets credit for this sale
- **convertToLead - integer**: Automatically convert the subscription to a lead following the request
- **initialInvoice - string**: When the initial invoice should get generated. INITIAL_COMPLETION = when the initial service is completed. SIGNED_AGREEMENT = when the agreement is signed. INITIAL_BILLING_DATE = on a specified billing date.
- **subscriptionID - integer - required**: Primary key to the tickets table.

---

## /subscription/updateInitialAddOn

<a name="documentation_subscriptionUpdateInitialAddOn"></a>

### Parameters

- **subscriptionID - integer - required**: Foreign key to subscriptions table.
- **productID - integer - required**: Foreign key to products table.
- **serviceID - integer**: Foreign key to serviceTypes table.
- **amount - number - required**: Amount to charge for this addon.
- **quantity - integer**: The number of items. Defaults to 1.
- **taxable - integer**: 1- tax 0 - no tax; Defaults to the value specified for serviceTaxable on initial ticket.
- **creditTo - integer**: The employee who will receive credit for selling the add-on for commissions. Defaults to creditTo on Service Subscription.
- **description - string**: Customer facing text for item.
- **addOnID - integer - required**: Foreign key to ticketItems table. Retrieve via getInitialAddons(subscriptionID).

---

## /subscription/updateLeadStage

<a name="documentation_subscriptionUpdateLeadStage"></a>

### Parameters

- **subscriptionID - integer - required**: Foreign key to subscriptions table.
- **subscriptionLink - integer**: Alternative to subscriptionID. This is the "SubscriptionID" sent during an API insert through import/main.
- **stageID - integer**: Lead stage ID.
- **status - integer**: 0 - Convert To Lead, 1 - Convert to subscription (lead won)
- **lostReason - integer**: Lead Lost Reason

---

## /task/[id]

<a name="documentation_taskGetID"></a>

**Description:** Get task data for single ID -- please provide a specific record ID in the URL structure.

### Parameters

- **-**

### Response

- **taskIDs - integer**: Primary key.
- **officeID - integer**: officeID of the task
- **customerID - integer**: customerID the task is related to
- **addedBy - integer**: EmployeeID who created the task
- **assignedTo - integer**: EmployeeID the task is assigned to
- **completedBy - integer**: EmployeeID who completed the task
- **type - integer**: Type of task: 0 - Alert, 1 - Task
- **dueDate - string**: Time the task or alert is due.
- **dateAdded - string**: Time the task or alert was added.
- **dateCompleted - string**: Time the task was completed
- **category - integer**: Category ID of the task.
- **categoryDescription - integer**: Category text of the task.
- **task - string**: Text description of the task.
- **completionNotes - string**: Completion notes for the task.
- **referenceID - integer**: ReferenceID for the task. (e.g. subscriptionID that it relates to)
- **phone - string**: Phone number associated with the task
- **dateUpdated - string**: Time the task was last updated.
- **status - string**: Status of the task. (0-Pending, 1-Completed, 2-In Use, 3-Urgent)

---

## /task/create

<a name="documentation_taskCreate"></a>

**Description:** Create a new task or alert.

### Parameters

- **type - integer - required**: 0: task, 1: alert
- **customerID - integer - required**: CustomerID the task pertains to
- **referenceID - integer**: SubscriptionID the task pertains to
- **phone - string**: Phone number for the task
- **category - integer**: categoryID of the task values: Appt Status (15), Billing (1), Customer Care (10), Customer Status (13), Feedback (7), Follow Up (5), Office (6), Reminder Reply (9), Sales (11), Scheduling (2), Service (4), SMS Reply (12), Subscription Status (14), Tech Flag (8), Voice Mail (3)
- **addedBy - integer**: EmployeeID who added the task or alert
- **assignedTo - integer**: EmployeeID the task is assigned to
- **dueDate - string**: Date the task is due
- **task - string**: Text description of the task
- **status - integer**: 0: Pending, 1: Completed, 2: In Use, 3: Urgent, -1: Deleted
- **dateCompleted - string**
- **completedBy - integer**
- **completionNotes - integer**

---

## /task/get

<a name="documentation_taskGetBulk"></a>

**Description:** Get Bulk data for task. Accepts an array of taskIDs. Returns a max of 1000 records.

### Parameters

- **taskIDs - array**

### Response

- **taskIDs - integer**: Primary key.
- **officeID - integer**: officeID of the task
- **customerID - integer**: customerID the task is related to
- **addedBy - integer**: EmployeeID who created the task
- **assignedTo - integer**: EmployeeID the task is assigned to
- **completedBy - integer**: EmployeeID who completed the task
- **type - integer**: Type of task: 0 - Alert, 1 - Task
- **dueDate - string**: Time the task or alert is due.
- **dateAdded - string**: Time the task or alert was added.
- **dateCompleted - string**: Time the task was completed
- **category - integer**: Category ID of the task.
- **categoryDescription - integer**: Category text of the task.
- **task - string**: Text description of the task.
- **completionNotes - string**: Completion notes for the task.
- **referenceID - integer**: ReferenceID for the task. (e.g. subscriptionID that it relates to)
- **phone - string**: Phone number associated with the task
- **dateUpdated - string**: Time the task was last updated.
- **status - string**: Status of the task. (0-Pending, 1-Completed, 2-In Use, 3-Urgent)

---

## /task/search

<a name="documentation_taskSearch"></a>

**Description:** Provide a set of parameters which will return a list of ids. There is no limit to the number of IDs this will return. You can then supply these ids to the `get` endpoint in order to retrieve bulk data. Every parameter available supports a simple value OR a powerful query object that gives you access to all basic comparators. 

Example: dateAdded={"operator":">","value":"2016-01-01"}

Example: dateAdded={"operator\":\"BETWEEN\",\"value\":[\"2016-05-12\",\"2016-05-13\"]}

Available operators: >, <, >=, <=, =, !=, IN, BETWEEN, LIKE, STARTSWITH, ENDSWITH, CONTAINS.

Each of the search endpoints allows for an optional parameter 'includeData'. When sent, the API will additionally send the resolved objects for the first 1000 IDs. Keep in mind when using 'includeData' that if there are more than 1000 items an additional property '{entity}IDsNoDataExported' will specify the items that are not included in the resolved data array.

### Parameters

- **taskIDs - integer**: Primary key.
- **officeID - integer**
- **officeIDs - integer**
- **customerID - integer**: CustomerID the task relates to.
- **addedBy - integer**: EmployeeID who created the task
- **assignedTo - integer**: EmployeeID the task is assigned to
- **completedBy - integer**: EmployeeID who completed the task
- **type - integer**: Type of task: 0 - Task, 1 - Alert
- **dueDate - string**: Time the task or alert is due.
- **dateAdded - string**: Time the task or alert was added.
- **category - integer**: Category ID of the task
- **referenceID - integer**: ReferenceID for the task. (e.g. subscriptionID that it relates to)
- **phone - string**: Phone number associated with the task
- **dateUpdated - string**: Time the task was last updated.
- **status - integer**: Status of the task. (0-Pending, 1-Completed, 2-In Use, 3-Urgent)
- **includeData - integer**: {0,1} Sends the resolved objects for the first 1000 IDs. If there are more than 1000 items an additional property taskIDsNoDataExported will specify the items that are not included in the resolved task array.

### Response

- **taskIDs - array**

---

## /task/update

<a name="documentation_taskUpdate"></a>

**Description:** Update a task.

### Parameters

- **type - integer**: 0: task, 1: alert
- **customerID - integer**: CustomerID the task pertains to
- **referenceID - integer**: SubscriptionID the task pertains to
- **phone - string**: Phone number for the task
- **category - integer**: categoryID of the task values: Appt Status (15), Billing (1), Customer Care (10), Customer Status (13), Feedback (7), Follow Up (5), Office (6), Reminder Reply (9), Sales (11), Scheduling (2), Service (4), SMS Reply (12), Subscription Status (14), Tech Flag (8), Voice Mail (3)
- **addedBy - integer**: EmployeeID who added the task or alert
- **assignedTo - integer**: EmployeeID the task is assigned to
- **dueDate - string**: Date the task is due
- **task - string**: Text description of the task
- **status - integer**: 0: Pending, 1: Completed, 2: In Use, 3: Urgent, -1: Deleted
- **dateCompleted - string**
- **completedBy - integer**
- **completionNotes - integer**
- **taskID - integer - required**: Primary key to the task table.

---

## /team/[id]

<a name="documentation_teamGetID"></a>

**Description:** Get team data for single ID -- please provide a specific record ID in the URL structure.

### Parameters

- **-**

### Response

- **teamID - integer**: Unique Identifier
- **officeID - integer**: Office ID this team belongs to
- **name - string**: Team name
- **teamLeader - integer**: Team Leader ID
- **employeeIDs - integer**: Employee IDs of team members

---

## /team/get

<a name="documentation_teamGetBulk"></a>

**Description:** Get Bulk data for team. Accepts an array of teamIDs. Returns a max of 1000 records.

### Parameters

- **teamIDs - array**

### Response

- **teamID - integer**: Unique Identifier
- **officeID - integer**: Office ID this team belongs to
- **name - string**: Team name
- **teamLeader - integer**: Team Leader ID
- **employeeIDs - integer**: Employee IDs of team members

---

## /team/search

<a name="documentation_teamSearch"></a>

**Description:** Provide a set of parameters which will return a list of ids. There is no limit to the number of IDs this will return. You can then supply these ids to the `get` endpoint in order to retrieve bulk data. Every parameter available supports a simple value OR a powerful query object that gives you access to all basic comparators. 

Example: dateAdded={"operator":">","value":"2016-01-01"}

Example: dateAdded={"operator\":\"BETWEEN\",\"value\":[\"2016-05-12\",\"2016-05-13\"]}

Available operators: >, <, >=, <=, =, !=, IN, BETWEEN, LIKE, STARTSWITH, ENDSWITH, CONTAINS.

Each of the search endpoints allows for an optional parameter 'includeData'. When sent, the API will additionally send the resolved objects for the first 1000 IDs. Keep in mind when using 'includeData' that if there are more than 1000 items an additional property '{entity}IDsNoDataExported' will specify the items that are not included in the resolved data array.

### Parameters

- **teamID - integer**: Unique Identifier
- **officeIDs - integer**
- **name - string**: Team Name
- **type - integer**: Team type. 0: Office Team, 2: Sales Team
- **teamLeader - integer**: Employee ID of the team leader
- **employeeIDs - integer**: Employee IDs of team members
- **includeData - integer**: {0,1} Sends the resolved objects for the first 1000 IDs. If there are more than 1000 items an additional property teamIDsNoDataExported will specify the items that are not included in the resolved team array.

### Response

- **teamIDs - array**

---

## /ticket/[id]

<a name="documentation_ticketGetID"></a>

**Description:** Get ticket data for single ID -- please provide a specific record ID in the URL structure.

### Parameters

- **-**

### Response

- **ticketID - integer**: Unique ID
- **customerID - integer**: Customer ID which this subscription belongs to
- **billToAccountID - integer**: Billing Account which this subscription belongs to
- **officeID - integer**: Office ID which this subscription belongs to
- **dateCreated - string**: Date this ticket was added / created.
- **invoiceDate - string**: Invoice date
- **dateUpdated - string**: The date the ticket was updated
- **active - integer**: 0: pending, 1: active and counts towards customer's outstanding balance, -1: a ticket template.
- **subTotal - number**: Subtotal = serviceCharge + sum of line items
- **taxAmount - number**: Total calculated tax
- **total - number**: Subtotal + total
- **serviceCharge - number**: Base charge for this ticket.
- **serviceTaxable - integer**: Whether or not the base service charge for this ticket is taxable (1) or not (0)
- **productionValue - number**: Value for reporting / commission purposes. -1: Same as subTotal, >= 0: different from subtotal
- **taxRate - number**: The tax rate associated with this ticket.
- **appointmentID - integer**: If this ticket is attached to an appointment it will show here
- **balance - number**: Any unpaid balance left on this ticket
- **subscriptionID - integer**: ONLY CONTAINS A VALUE WHEN THIS IS A TEMPLATE for a particular subscription. These should never be active
- **autoGenerated - integer**: The subscription ID that generated this ticket when it was part of recurring billing, from a renewal or for the initial service if the initial invoice does not get generated at the time of service completion.
- **autoGeneratedType - string**: Indicates if the invoice was create as part of the recurring billing schedule, for a subscription renewal or is the initial invoice when the initial invoice is not created at the time of service completion.
                    INITIAL = initial invoice, RECURRING = recurring billing invoice, RENEWAL = renewal invoice.
- **renewalID - integer**: The subscription ID that generated this ticket when it was part of a renewal
- **serviceID - integer**: Ticket service type
- **items - string**: An array of line items associated with this ticket
- **invoiceNumber - string**: The displayed Invoice #
- **templateType - string**: The ticket template type. I: initial ticket template, R: recurring ticket template, NA: not a ticket template.
- **glNumber - string**: glNumber of the ticket
- **createdBy - string**: employeeID who created the Ticket

---

## /ticket/create

<a name="documentation_ticketCreate"></a>

### Parameters

- **customerID - integer - required**: Foreign key to customers table.
- **subscriptionID - integer - required**: Foreign key to subscription table.
- **serviceID - integer - required**: Foreign key to serviceTypes table.
- **serviceTaxable - integer**: 1- tax 0 - no tax; Defaults to the value specified for given serviceID.
- **date - string - required**: Date this invoice should be applied
- **billToAccountID - integer**: Foreign key to customers table.
- **serviceCharge - number - required**: Value in USD.
- **additionalNotes - string**: Add notes about the invoice.
- **status - string**: 0 = not active, 1 = active, -1 = ticket template, -3 = lead
- **templateType - string**: R = recurring, I = initial, NA = not applicable/not a template
- **productionValue - number**: Production value for this ticket.
- **addons - array**: Array of ticket addon objects, see ticket/createAddon. Send as empty array or false to unset.

---

## /ticket/createAddOn

<a name="documentation_ticketCreateAddOn"></a>

### Parameters

- **ticketID - integer - required**: Foreign key to tickets table. Retrieve via getAddons(subscriptionID).
- **description - string**: Customer Facing text for item.
- **quantity - integer**: Number of products or services to add.
- **amount - number - required**: Charge Amount for item.
- **productID - integer**: Foreign key to products table.
- **serviceID - integer**: Foreign key to services Table.
- **taxable - integer - required**: 0 for untaxable, 1 for taxable. Items with negative amounts cannot be taxable.
- **creditTo - integer**: Foreign key to employees table.
- **unitID - integer**: Foreign key to unit table (if applicable for unit specific addons on multi-unit customers)

---

## /ticket/delete

<a name="documentation_ticketDelete"></a>

### Parameters

- **ticketID - integer - required**: Primary key to tickets table.

---

## /ticket/deleteAddOn

<a name="documentation_ticketDeleteAddOn"></a>

**Description:** Delete a ticketItem from the given ticketID.

### Parameters

- **ticketID - integer - required**: Foreign key to subscriptions table.
- **itemID - integer - required**: Foreign key to ticketItems table. Retrieve via getAddons(subscriptionID).

---

## /ticket/get

<a name="documentation_ticketGetBulk"></a>

**Description:** Get Bulk data for ticket. Accepts an array of ticketIDs. Returns a max of 1000 records.

### Parameters

- **ticketIDs - array**

### Response

- **ticketID - integer**: Unique ID
- **customerID - integer**: Customer ID which this subscription belongs to
- **billToAccountID - integer**: Billing Account which this subscription belongs to
- **officeID - integer**: Office ID which this subscription belongs to
- **dateCreated - string**: Date this ticket was added / created.
- **invoiceDate - string**: Invoice date
- **dateUpdated - string**: The date the ticket was updated
- **active - integer**: 0: pending, 1: active and counts towards customer's outstanding balance, -1: a ticket template.
- **subTotal - number**: Subtotal = serviceCharge + sum of line items
- **taxAmount - number**: Total calculated tax
- **total - number**: Subtotal + total
- **serviceCharge - number**: Base charge for this ticket.
- **serviceTaxable - integer**: Whether or not the base service charge for this ticket is taxable (1) or not (0)
- **productionValue - number**: Value for reporting / commission purposes. -1: Same as subTotal, >= 0: different from subtotal
- **taxRate - number**: The tax rate associated with this ticket.
- **appointmentID - integer**: If this ticket is attached to an appointment it will show here
- **balance - number**: Any unpaid balance left on this ticket
- **subscriptionID - integer**: ONLY CONTAINS A VALUE WHEN THIS IS A TEMPLATE for a particular subscription. These should never be active
- **autoGenerated - integer**: The subscription ID that generated this ticket when it was part of recurring billing, from a renewal or for the initial service if the initial invoice does not get generated at the time of service completion.
- **autoGeneratedType - string**: Indicates if the invoice was create as part of the recurring billing schedule, for a subscription renewal or is the initial invoice when the initial invoice is not created at the time of service completion.
                    INITIAL = initial invoice, RECURRING = recurring billing invoice, RENEWAL = renewal invoice.
- **renewalID - integer**: The subscription ID that generated this ticket when it was part of a renewal
- **serviceID - integer**: Ticket service type
- **items - string**: An array of line items associated with this ticket
- **invoiceNumber - string**: The displayed Invoice #
- **templateType - string**: The ticket template type. I: initial ticket template, R: recurring ticket template, NA: not a ticket template.
- **glNumber - string**: glNumber of the ticket
- **createdBy - string**: employeeID who created the Ticket

---

## /ticket/getAddOns

<a name="documentation_ticketGetAddOns"></a>

**Description:** Get Addons for a ticket.

### Parameters

- **ticketID - integer - required**: Foreign key to tickets table.

### Response

- **itemID - integer**: Primary key for ticketItems
- **ticketID - integer**: Foreign key to tickets table. Retrieve via getAddons(subscriptionID).
- **description - string**: Customer Facing text for item.
- **quantity - integer**: Number of products or services to add.
- **amount - number**: Charge Amount for item.
- **productID - integer**: Foreign key to products table.
- **serviceID - integer**: Foreign key to services Table.
- **taxable - integer**: 0 for untaxable, 1 for taxable. Items with negative amounts cannot be taxable.
- **creditTo - integer**: Foreign key to employees table.
- **unitID - integer**: Foreign key to unit table (if applicable for unit specific addons on multi-unit customers)

---

## /ticket/search

<a name="documentation_ticketSearch"></a>

**Description:** Provide a set of parameters which will return a list of ids. There is no limit to the number of IDs this will return. You can then supply these ids to the `get` endpoint in order to retrieve bulk data. Every parameter available supports a simple value OR a powerful query object that gives you access to all basic comparators. 

Example: dateAdded={"operator":">","value":"2016-01-01"}

Example: dateAdded={"operator\":\"BETWEEN\",\"value\":[\"2016-05-12\",\"2016-05-13\"]}

Available operators: >, <, >=, <=, =, !=, IN, BETWEEN, LIKE, STARTSWITH, ENDSWITH, CONTAINS.

Each of the search endpoints allows for an optional parameter 'includeData'. When sent, the API will additionally send the resolved objects for the first 1000 IDs. Keep in mind when using 'includeData' that if there are more than 1000 items an additional property '{entity}IDsNoDataExported' will specify the items that are not included in the resolved data array.

### Parameters

- **officeIDs - integer**
- **ticketIDs - integer**
- **status - integer**: Whether this ticket/invoice is active: 1 or inactive: 0. Inactive tickets are not added to the customer's balance or A/R aging
- **customerIDs - integer**: The customer who owns this ticket
- **recurringTemplateSubscriptionIDs - integer**: When a ticket has a recurring template subscription ID it represents a recurring ticket template
- **dateCreated - string**: The date this ticket was created
- **invoiceDate - string**: Invoice date
- **dateUpdated - string**: The date the ticket was updated
- **balance - number**: Any unpaid balance left on this ticket
- **subTotal - number**: Amount of ticket before tax
- **total - number**: Total of invoice including any applicable taxes
- **taxAmount - number**: Amount of tax
- **appointmentIDs - integer**: The appointment this ticket was generated for. Tickets may not always be attached to an appointment. For example in cases of recurring billing or stand alone invoices for administrative fees.
- **subscriptionIDs - integer**: The subscription this ticket was generated for. This is only used for the ticket template which define the price of the subscription setup.
- **templateType - string**: The ticket template type. I: initial ticket template, R: recurring ticket template, NA: not a ticket template.
- **includeData - integer**: {0,1} Sends the resolved objects for the first 1000 IDs. If there are more than 1000 items an additional property ticketIDsNoDataExported will specify the items that are not included in the resolved ticket array.

### Response

- **ticketIDs - array**

---

## /ticket/setAddOns

<a name="documentation_ticketSetAddOns"></a>

**Description:** Delete all existing addons and set the addons for the specified ticket to the received array.

### Parameters

- **ticketID - integer - required**: Foreign key to subscriptions table.
- **addons - array**: Addon Entity - see createAddOn params

---

## /ticket/update

<a name="documentation_ticketUpdate"></a>

### Parameters

- **customerID - integer**: Foreign key to customers table.
- **subscriptionID - integer**: Foreign key to subscription table.
- **serviceID - integer**: Foreign key to serviceTypes table.
- **serviceTaxable - integer**: 1- tax 0 - no tax; Defaults to the value specified for given serviceID.
- **date - string**: Date this invoice should be applied
- **billToAccountID - integer**: Foreign key to customers table.
- **serviceCharge - number**: Value in USD.
- **additionalNotes - string**: Add notes about the invoice.
- **status - string**: 0 = not active, 1 = active, -1 = ticket template, -3 = lead
- **templateType - string**: R = recurring, I = initial, NA = not applicable/not a template
- **productionValue - number**: Production value for this ticket.
- **addons - array**: If addons are sent with ticket/update a `setAddons` operation will be used. Old addons will be removed and new addons will be created to match the array sent.
- **ticketID - integer - required**: Primary key to the tickets table.

---

## /ticket/updateAddOn

<a name="documentation_ticketUpdateAddOn"></a>

### Parameters

- **ticketID - integer - required**: Foreign key to tickets table. Retrieve via getAddons(subscriptionID).
- **description - string**: Customer Facing text for item.
- **quantity - integer**: Number of products or services to add.
- **amount - number**: Charge Amount for item.
- **productID - integer**: Foreign key to products table.
- **serviceID - integer**: Foreign key to services Table.
- **taxable - integer**: 0 for untaxable, 1 for taxable. Items with negative amounts cannot be taxable.
- **creditTo - integer**: Foreign key to employees table.
- **unitID - integer**: Foreign key to unit table (if applicable for unit specific addons on multi-unit customers)
- **itemID - integer - required**: Primary key to the ticketItems table.

---

## /ticketItem/[id]

<a name="documentation_ticketItemGetID"></a>

**Description:** Get ticketItem data for single ID -- please provide a specific record ID in the URL structure.

### Parameters

- **-**

### Response

- **itemID - integer**: Unique ID
- **ticketID - integer**: ticket ID
- **officeID - integer**: office ID
- **description - string**: description
- **quantity - integer**: quantity
- **amount - number**: amount
- **productID - integer**: productID
- **serviceID - integer**: serviceID
- **taxable - integer**: taxable
- **creditTo - integer**: creditTo
- **unitID - integer**: unitID
- **glNumber - string**: glNumber
- **measurementSF - integer**: measurementSF
- **measurementLF - integer**: measurementLF
- **prepaymentAmount - integer**: prepaymentAmount
- **category - string**: product category
- **code - string**: product code
- **dateCreated - string**: Date this ticketItem was added / created.
- **dateUpdated - string**: The date the ticketItem was updated

---

## /ticketItem/get

<a name="documentation_ticketItemGetBulk"></a>

**Description:** Get Bulk data for ticketItem. Accepts an array of itemIDs. Returns a max of 1000 records.

### Parameters

- **itemIDs - array**

### Response

- **itemID - integer**: Unique ID
- **ticketID - integer**: ticket ID
- **officeID - integer**: office ID
- **description - string**: description
- **quantity - integer**: quantity
- **amount - number**: amount
- **productID - integer**: productID
- **serviceID - integer**: serviceID
- **taxable - integer**: taxable
- **creditTo - integer**: creditTo
- **unitID - integer**: unitID
- **glNumber - string**: glNumber
- **measurementSF - integer**: measurementSF
- **measurementLF - integer**: measurementLF
- **prepaymentAmount - integer**: prepaymentAmount
- **category - string**: product category
- **code - string**: product code
- **dateCreated - string**: Date this ticketItem was added / created.
- **dateUpdated - string**: The date the ticketItem was updated

---

## /ticketItem/search

<a name="documentation_ticketItemSearch"></a>

**Description:** Provide a set of parameters which will return a list of ids. There is no limit to the number of IDs this will return. You can then supply these ids to the `get` endpoint in order to retrieve bulk data. Every parameter available supports a simple value OR a powerful query object that gives you access to all basic comparators. 

Example: dateAdded={"operator":">","value":"2016-01-01"}

Example: dateAdded={"operator\":\"BETWEEN\",\"value\":[\"2016-05-12\",\"2016-05-13\"]}

Available operators: >, <, >=, <=, =, !=, IN, BETWEEN, LIKE, STARTSWITH, ENDSWITH, CONTAINS.

Each of the search endpoints allows for an optional parameter 'includeData'. When sent, the API will additionally send the resolved objects for the first 1000 IDs. Keep in mind when using 'includeData' that if there are more than 1000 items an additional property '{entity}IDsNoDataExported' will specify the items that are not included in the resolved data array.

### Parameters

- **itemIDs - integer**
- **officeIDs - integer**
- **officeID - integer**
- **ticketID - integer**
- **ticketIDs - integer**
- **productID - integer**
- **serviceID - integer**
- **glNumber - integer**
- **creditTo - integer**
- **dateUpdated - string**
- **dateCreated - string**
- **includeData - integer**: {0,1} Sends the resolved objects for the first 1000 IDs. If there are more than 1000 items an additional property ticketItemIDsNoDataExported will specify the items that are not included in the resolved ticketItem array.

### Response

- **ticketItemIDs - array**

---

## /timeClock/[id]

<a name="documentation_timeClockGetID"></a>

**Description:** Get timeClock data for single ID -- please provide a specific record ID in the URL structure.

### Parameters

- **-**

### Response

- **entryID - integer**: Unique ID
- **employeeID - integer**: EmployeeID time clock entry applied to
- **officeID - integer**: officeID the time clock entry was made on
- **timeIn - string**: Clock-in time in server time (PST)
- **timeOut - string**: Clock-Out time in server time (PST)
- **clockCategoryID - integer**: Clock category ID that was used for this entry
- **paid - integer**: 0 - time clock category is specified as unpaid, 1 - time clock category is specified as paid. If time clock category is specified as 0 or does not exist it is considered a paid entry.

---

## /timeClock/get

<a name="documentation_timeClockGetBulk"></a>

**Description:** Get Bulk data for timeClock. Accepts an array of entryIDs. Returns a max of 1000 records.

### Parameters

- **entryIDs - array**

### Response

- **entryID - integer**: Unique ID
- **employeeID - integer**: EmployeeID time clock entry applied to
- **officeID - integer**: officeID the time clock entry was made on
- **timeIn - string**: Clock-in time in server time (PST)
- **timeOut - string**: Clock-Out time in server time (PST)
- **clockCategoryID - integer**: Clock category ID that was used for this entry
- **paid - integer**: 0 - time clock category is specified as unpaid, 1 - time clock category is specified as paid. If time clock category is specified as 0 or does not exist it is considered a paid entry.

---

## /timeClock/search

<a name="documentation_timeClockSearch"></a>

**Description:** Provide a set of parameters which will return a list of ids. There is no limit to the number of IDs this will return. You can then supply these ids to the `get` endpoint in order to retrieve bulk data. Every parameter available supports a simple value OR a powerful query object that gives you access to all basic comparators. 

Example: dateAdded={"operator":">","value":"2016-01-01"}

Example: dateAdded={"operator\":\"BETWEEN\",\"value\":[\"2016-05-12\",\"2016-05-13\"]}

Available operators: >, <, >=, <=, =, !=, IN, BETWEEN, LIKE, STARTSWITH, ENDSWITH, CONTAINS.

Each of the search endpoints allows for an optional parameter 'includeData'. When sent, the API will additionally send the resolved objects for the first 1000 IDs. Keep in mind when using 'includeData' that if there are more than 1000 items an additional property '{entity}IDsNoDataExported' will specify the items that are not included in the resolved data array.

### Parameters

- **entryIDs - integer**: Primary key.
- **timeClockIDs - integer**: Primary key (alias)
- **officeIDs - integer**
- **employeeIDs - integer**: EmployeeID who the time clock entry applies to.
- **timeIn - string**: Clock-in time
- **timeOut - string**: Clock-out time
- **paid - integer**: 0 for unpaid categories, 1 for paid categories. Clock entries with no category association are considered paid.
- **includeData - integer**: {0,1} Sends the resolved objects for the first 1000 IDs. If there are more than 1000 items an additional property timeClockIDsNoDataExported will specify the items that are not included in the resolved timeClock array.

### Response

- **timeClockIDs - array**

---

## /timeClockCategory/[id]

<a name="documentation_timeClockCategoryGetID"></a>

**Description:** Get timeClockCategory data for single ID -- please provide a specific record ID in the URL structure.

### Parameters

- **-**

### Response

- **clockCategoryID - integer**: Primary key.
- **officeID - integer**
- **visible - integer**: Visible to staff
- **allowOnClockIn - integer**: time clock category is allowed on initial clock in.
- **systemReserved - integer**: 1 = system reserved category (cannot be deleted or changed)
- **paid - integer**: 0 for unpaid categories, 1 for paid categories. Clock entries with no category association are considered paid.
- **dateUpdated - string**: Date this category was last changed
- **description - integer**: Description associated with the clock category

---

## /timeClockCategory/get

<a name="documentation_timeClockCategoryGetBulk"></a>

**Description:** Get Bulk data for timeClockCategory. Accepts an array of clockCategoryIDs. Returns a max of 1000 records.

### Parameters

- **clockCategoryIDs - array**

### Response

- **clockCategoryID - integer**: Primary key.
- **officeID - integer**
- **visible - integer**: Visible to staff
- **allowOnClockIn - integer**: time clock category is allowed on initial clock in.
- **systemReserved - integer**: 1 = system reserved category (cannot be deleted or changed)
- **paid - integer**: 0 for unpaid categories, 1 for paid categories. Clock entries with no category association are considered paid.
- **dateUpdated - string**: Date this category was last changed
- **description - integer**: Description associated with the clock category

---

## /timeClockCategory/search

<a name="documentation_timeClockCategorySearch"></a>

**Description:** Provide a set of parameters which will return a list of ids. There is no limit to the number of IDs this will return. You can then supply these ids to the `get` endpoint in order to retrieve bulk data. Every parameter available supports a simple value OR a powerful query object that gives you access to all basic comparators. 

Example: dateAdded={"operator":">","value":"2016-01-01"}

Example: dateAdded={"operator\":\"BETWEEN\",\"value\":[\"2016-05-12\",\"2016-05-13\"]}

Available operators: >, <, >=, <=, =, !=, IN, BETWEEN, LIKE, STARTSWITH, ENDSWITH, CONTAINS.

Each of the search endpoints allows for an optional parameter 'includeData'. When sent, the API will additionally send the resolved objects for the first 1000 IDs. Keep in mind when using 'includeData' that if there are more than 1000 items an additional property '{entity}IDsNoDataExported' will specify the items that are not included in the resolved data array.

### Parameters

- **clockCategoryIDs - integer**: Primary key.
- **timeClockCategoryIDs - integer**: Primary key (alias)
- **officeIDs - integer**
- **visible - integer**: Visible to staff
- **allowOnClockIn - integer**: time clock category is allowed on initial clock in.
- **systemReserved - integer**: 1 = system reserved category (cannot be deleted or changed)
- **paid - integer**: 0 for unpaid categories, 1 for paid categories. Clock entries with no category association are considered paid.
- **dateUpdated - string**: Date this category was last changed
- **includeData - integer**: {0,1} Sends the resolved objects for the first 1000 IDs. If there are more than 1000 items an additional property timeClockCategoryIDsNoDataExported will specify the items that are not included in the resolved timeClockCategory array.

### Response

- **timeClockCategoryIDs - array**

---

## /unit/[id]

<a name="documentation_unitGetID"></a>

**Description:** Get unit data for single ID -- please provide a specific record ID in the URL structure.

### Parameters

- **-**

### Response

- **unitID - integer**: Unique ID
- **unitName - string**: Unit name (building + - + description)
- **building - string**: Unit building
- **description - string**: Unit description
- **customerID - integer**: customerID the unit belongs to.

---

## /unit/get

<a name="documentation_unitGetBulk"></a>

**Description:** Get Bulk data for unit. Accepts an array of unitIDs. Returns a max of 1000 records.

### Parameters

- **unitIDs - array**

### Response

- **unitID - integer**: Unique ID
- **unitName - string**: Unit name (building + - + description)
- **building - string**: Unit building
- **description - string**: Unit description
- **customerID - integer**: customerID the unit belongs to.

---

## /unit/search

<a name="documentation_unitSearch"></a>

**Description:** Provide a set of parameters which will return a list of ids. There is no limit to the number of IDs this will return. You can then supply these ids to the `get` endpoint in order to retrieve bulk data. Every parameter available supports a simple value OR a powerful query object that gives you access to all basic comparators. 

Example: dateAdded={"operator":">","value":"2016-01-01"}

Example: dateAdded={"operator\":\"BETWEEN\",\"value\":[\"2016-05-12\",\"2016-05-13\"]}

Available operators: >, <, >=, <=, =, !=, IN, BETWEEN, LIKE, STARTSWITH, ENDSWITH, CONTAINS.

Each of the search endpoints allows for an optional parameter 'includeData'. When sent, the API will additionally send the resolved objects for the first 1000 IDs. Keep in mind when using 'includeData' that if there are more than 1000 items an additional property '{entity}IDsNoDataExported' will specify the items that are not included in the resolved data array.

### Parameters

- **unitIDs - integer**: Primary key.
- **officeIDs - integer**
- **customerIDs - integer**: Customer who owns this unit
- **includeData - integer**: {0,1} Sends the resolved objects for the first 1000 IDs. If there are more than 1000 items an additional property unitIDsNoDataExported will specify the items that are not included in the resolved unit array.

### Response

- **unitIDs - array**

---

