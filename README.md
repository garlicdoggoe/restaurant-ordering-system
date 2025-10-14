# Restaurant Ordering System

A comprehensive restaurant ordering and management system built with Next.js, Convex, and shadcn/ui.

## Features

### Restaurant Owner Dashboard
- **Order Management**: View and manage all orders with filtering by status (pending, dine-in, takeaway, served)
- **Accept/Deny Orders**: Review orders with payment screenshots and accept or deny with preset or custom reasons
- **Menu Management**: Full CRUD operations for menu items and categories
- **Restaurant Settings**: Update restaurant profile, status (open/closed/busy), and average preparation/delivery times
- **Voucher Management**: Create and manage discount vouchers with usage limits and validity periods
- **Promotion Management**: Create promotional banners displayed on the customer interface

### Customer Interface
- **Menu Browsing**: Browse menu items by category with search functionality
- **Shopping Cart**: Add items to cart with quantity management
- **Order Placement**: Place orders with order type selection (dine-in, takeaway, delivery)
- **Payment Screenshot**: Upload payment proof with orders
- **Order History**: View completed orders
- **Pending Order Protection**: Prevents placing new orders while a pending order exists
- **Active Promotions**: View current promotional offers

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Database**: Convex (real-time database)
- **UI Components**: shadcn/ui
- **Styling**: Tailwind CSS v4
- **Type Safety**: TypeScript

## Getting Started

### Prerequisites
- Node.js 18+ installed
- Convex account (sign up at https://convex.dev)

### Installation

1. Clone the repository
2. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`

3. Set up Convex:
   \`\`\`bash
   npx convex dev
   \`\`\`

4. Create a `.env.local` file and add your Convex URL:
   \`\`\`
   NEXT_PUBLIC_CONVEX_URL=your_convex_deployment_url
   \`\`\`

5. Seed the database with dummy data:
   - Open the Convex dashboard
   - Run the `seed:seedDatabase` mutation

6. Start the development server:
   \`\`\`bash
   npm run dev
   \`\`\`

7. Open [http://localhost:3000](http://localhost:3000)

## Project Structure

\`\`\`
├── app/
│   ├── owner/          # Restaurant owner dashboard
│   ├── customer/       # Customer ordering interface
│   └── page.tsx        # Landing page
├── components/
│   ├── owner/          # Owner dashboard components
│   ├── customer/       # Customer interface components
│   └── ui/             # shadcn/ui components
├── convex/
│   ├── schema.ts       # Database schema
│   ├── orders.ts       # Order queries and mutations
│   ├── menuItems.ts    # Menu item operations
│   ├── vouchers.ts     # Voucher management
│   ├── promotions.ts   # Promotion management
│   └── seed.ts         # Database seeding
└── lib/
    └── convex.ts       # Convex client setup
\`\`\`

## Database Schema

- **users**: Customer and owner accounts
- **restaurants**: Restaurant profiles
- **categories**: Menu categories
- **menuItems**: Menu items with pricing and availability
- **orders**: Customer orders with status tracking
- **vouchers**: Discount vouchers
- **promotions**: Promotional materials
- **denialReasons**: Preset order denial reasons

## Usage

### Owner Dashboard
1. Navigate to `/owner`
2. View pending orders in the "Order Line" section
3. Click on an order to view details and accept/deny
4. Manage menu items in the "Menu" section
5. Create vouchers and promotions
6. Update restaurant settings and status

### Customer Interface
1. Navigate to `/customer`
2. Browse menu items by category
3. Add items to cart
4. Proceed to checkout and place order
5. View order history in "My Orders"

## Notes

- This is a demo application using dummy data
- For production use, implement proper authentication
- Add file upload functionality for payment screenshots and menu images
- Configure proper environment variables for Convex deployment
