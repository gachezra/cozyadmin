# **App Name**: CozyAdmin

## Core Features:

- Secure Admin Authentication: Secure admin login using custom token authentication against the 'users' collection in Firestore, using a pure JavaScript hashing library (argon2 or Node.js crypto) for password verification. Includes JWT-based session management with token storage in localStorage and route guarding.
- Product Management: Product Management: CRUD operations for the 'products' collection in Firestore. Includes viewing, adding, editing, and deleting products with validation. Includes a product list view, and add/edit product forms.
- Order Management: Order Management: Read and update operations for the 'orders' collection in Firestore. Includes viewing order details and updating order status with options for filtering and searching.

## Style Guidelines:

- Primary color: Neutral white or light gray for a clean, professional look.
- Secondary color: Dark gray or black for text and key elements to ensure high contrast and readability.
- Accent: Teal (#008080) to highlight important actions and interactive elements.
- Clear and consistent font usage for all text elements.
- Simple and recognizable icons to represent common actions and data types.
- Consistent layout with clear navigation for efficient task management.