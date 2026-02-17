# **App Name**: SOW Manager

## Core Features:

- SOW Details Capture: Allow users to upload SOW documents from which the app can automatically capture key details, while also providing the ability to manually modify the extracted information.
- SOW Renewal Alert: Automatically flag SOWs for renewal three months in advance of their end date. Renewal cycle is annual.
- Monthly Billing Preview: Calculate and show the expected monthly billing amount based on the number of working days and the agreed-upon billing rate.
- Holiday Input: Enter the number of regional holidays for the month. These holidays will affect the overall working days and the monthly billable amount.
- Individual Leave Tracking: Enter the number of leave days taken by each resource each month. This is factored into the monthly billing calculation to adjust for non-worked days.
- Currency Conversion: Input the current currency conversion rate to USD.  This converts the billing amount into USD for easy reconciliation.
- Anomaly Detector: This feature monitors recent billing amounts to identify outliers (that is, large and unexpected deviations). This tool takes SOW details, regional holiday, leaves to accurately asses if an amount is indeed anomalous, and can proactively inform the user of possible discrepancies.

## Style Guidelines:

- Primary color: Midnight blue (#2C3E50) to convey trust, stability, and professionalism.
- Background color: Light gray (#F0F3F4) to offer a clean and unobtrusive backdrop.
- Accent color: Teal (#29ABE2) for interactive elements, providing a modern and accessible feel.
- Font pairing: 'Inter' sans-serif for body text, paired with 'Space Grotesk' sans-serif for headings. Note: currently only Google Fonts are supported.
- Use minimalist, consistent icons from a set like Font Awesome to represent different functions (e.g., edit, save, alert).
- Maintain a clear and structured layout, using grid-based design principles. Keep key performance indicators prominent for quick overview.
- Subtle transitions and feedback animations for user interactions. Avoid excessive or distracting animations.