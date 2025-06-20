# Order Detail Actions & Enhancements Implementation Plan

## Overview
Enhance the order detail page with actionable features including order management actions, payment details display, and PDF export functionality. This plan prioritizes high-value features while documenting future enhancements.

## Priority 1: Immediate Implementation

### 1. Order Management Actions
**Location**: Order detail page (`[orderId].vue`)

#### 1.1 Order Status Actions
- **Refund Order**: Update status to "refunded" with refund timestamp
- **Cancel Order**: Update status to "canceled" 
- **Mark as Fulfilled**: Update status to "fulfilled"
- **Mark as Shipped**: Update status to "shipped" (for physical products)

#### 1.2 Implementation Details
```typescript
// API Endpoints to create:
// POST /api/admin/orders/[orderId]/refund
// POST /api/admin/orders/[orderId]/cancel
// POST /api/admin/orders/[orderId]/fulfill
// POST /api/admin/orders/[orderId]/ship

// Database updates needed:
// - orders.status (string)
// - orders.refunded_at (timestamp)
// - orders.fulfilled_at (timestamp)
// - orders.shipped_at (timestamp)
// - orders.updated_at (timestamp)
```

#### 1.3 UI Components
- **Action Panel**: Sidebar or card with action buttons
- **Confirmation Modals**: For destructive actions (refund, cancel)
- **Status Timeline**: Visual representation of order progression
- **Success/Error Notifications**: Feedback for actions

### 2. Enhanced Payment Information Display
**Goal**: Show comprehensive payment details when available

#### 2.1 Payment Details to Display
- Payment method type (card, bank transfer, etc.)
- Last 4 digits of card (if card payment)
- Payment provider logos (Stripe, PayPal, etc.)
- Transaction ID from payment provider
- Payment date/time
- Authorization code

#### 2.2 Data Structure Enhancement
```sql
-- Enhance orders table or create payment_details table
ALTER TABLE orders ADD COLUMN payment_method VARCHAR(50);
ALTER TABLE orders ADD COLUMN card_last_four VARCHAR(4);
ALTER TABLE orders ADD COLUMN transaction_id VARCHAR(255);
ALTER TABLE orders ADD COLUMN authorization_code VARCHAR(255);
```

### 3. PDF Export & Print Functionality
**Inspiration**: Based on `ticket-pdf.ts` structure

#### 3.1 Order Receipt PDF Generation
- **Server endpoint**: `/api/admin/orders/[orderId]/export-pdf`
- **Features**: Professional order summary with company branding
- **Content**: Order details, products, totals, customer info

#### 3.2 PDF Structure (inspired by ticket-pdf.ts)
```typescript
// server/api/admin/orders/[orderId]/export-pdf.ts
- Header with company logo and order title
- Order information section (ID, status, date)
- Customer details section
- Products table with quantities and prices
- Payment information section
- Footer with company details and QR code for verification
```

#### 3.3 Print Stylesheet
- CSS optimized for printing
- Hide navigation and action buttons
- Ensure proper page breaks
- Black and white friendly design

## Priority 2: Future Enhancements (Annotated Ideas)

### 2.1 Order Timeline & Status History
```typescript
// Future implementation: order_status_history table
// Tracks all status changes with timestamps and user who made the change
// Visual timeline component showing order progression
// Estimated effort: 2-3 days
```

### 2.2 Audit Trail System
```typescript
// Future implementation: order_audit_log table
// Tracks who viewed/modified orders and when
// Integration with user authentication system
// Privacy considerations for GDPR compliance
// Estimated effort: 3-4 days
```

### 2.3 Extended Customer Information Panel
```typescript
// Future implementation: customer profile aggregation
// Show customer's order history across all events
// Customer lifetime value calculations
// Integration with CRM systems
// Estimated effort: 4-5 days
```

### 2.4 Advanced Payment Details
```typescript
// Future implementation: payment_details table
// Store encrypted payment method details
// Integration with payment provider APIs for real-time status
// Fraud detection indicators
// Estimated effort: 3-4 days
```

### 2.5 Order Analytics & Insights
```typescript
// Future implementation: analytics dashboard
// Order value trends
// Product performance metrics
// Customer behavior analysis
// Integration with analytics providers
// Estimated effort: 5-7 days
```

## Technical Implementation Plan

### Phase 1: Database Schema Updates
```sql
-- Add new columns to orders table
ALTER TABLE orders ADD COLUMN fulfilled_at TIMESTAMP NULL;
ALTER TABLE orders ADD COLUMN shipped_at TIMESTAMP NULL;
ALTER TABLE orders ADD COLUMN payment_method VARCHAR(50);
ALTER TABLE orders ADD COLUMN card_last_four VARCHAR(4);
ALTER TABLE orders ADD COLUMN transaction_id VARCHAR(255);

-- Create audit log table for future use
CREATE TABLE order_actions_log (
    id SERIAL PRIMARY KEY,
    order_id UUID REFERENCES orders(id),
    action VARCHAR(50) NOT NULL,
    performed_by UUID REFERENCES users(id),
    performed_at TIMESTAMP DEFAULT NOW(),
    notes TEXT
);
```

### Phase 2: Server API Endpoints
```typescript
// server/api/admin/orders/[orderId]/actions.post.ts
// Unified endpoint for order actions
// Input: { action: 'refund'|'cancel'|'fulfill'|'ship', notes?: string }
// Output: { success: boolean, updatedOrder: Order }

// server/api/admin/orders/[orderId]/export-pdf.ts
// PDF generation endpoint
// Uses similar structure to ticket-pdf.ts
// Returns PDF buffer for download
```

### Phase 3: Frontend Components
```vue
<!-- Components to create/update -->
<!-- OrderActionPanel.vue - Action buttons and modals -->
<!-- OrderPaymentDetails.vue - Enhanced payment info display -->
<!-- OrderExportButtons.vue - PDF export and print functionality -->
<!-- OrderStatusBadge.vue - Enhanced status display with colors -->
```

### Phase 4: UI/UX Enhancements
- **Action Panel**: Fixed sidebar with action buttons
- **Modal System**: Confirmation dialogs for destructive actions
- **Status Indicators**: Color-coded badges with icons
- **Export Options**: Download PDF, print, email receipt
- **Responsive Design**: Mobile-friendly action panel

## File Structure
```
server/
├── api/admin/orders/[orderId]/
│   ├── actions.post.ts (order management actions)
│   └── export-pdf.ts (PDF generation)
└── utils/
    └── order-pdf.ts (PDF generation utility)

components/admin/orders/
├── OrderActionPanel.vue
├── OrderPaymentDetails.vue
├── OrderExportButtons.vue
└── OrderStatusBadge.vue

pages/admin/event/[id]/orders/
└── [orderId].vue (enhanced with new components)
```

## Security Considerations
- **Permission Checks**: Verify user has order management permissions
- **Action Logging**: Log all order modifications for audit trail
- **Payment Data**: Handle sensitive payment information securely
- **PDF Generation**: Validate order ownership before generating PDFs

## Testing Strategy
- **Unit Tests**: Order action functions and PDF generation
- **Integration Tests**: API endpoints and database updates
- **UI Tests**: Action panel functionality and modal interactions
- **Security Tests**: Permission verification and data validation

## Success Metrics
- **User Engagement**: Increased usage of order management features
- **Efficiency**: Reduced time to process order actions
- **Error Reduction**: Fewer manual errors in order processing
- **Customer Satisfaction**: Faster order resolution times

This implementation plan provides immediate value through order actions and PDF export while documenting future enhancements for systematic development.
