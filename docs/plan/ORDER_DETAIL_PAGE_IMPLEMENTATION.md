# Order Detail Page Implementation Plan

## Overview
Create a new order detail page accessible via `/admin/event/[eventId]/orders/[orderId]` that displays comprehensive information about a specific order including its products, quantities, and pricing.

## Database Structure Analysis
Based on Supabase project `gvuwtsdhgqefamzyfyjm`:

### Key Tables:
- **orders**: Main order information (id, user_id, status, total_amount, currency, buyer_email, created_at, etc.)
- **order_products**: Junction table linking orders to products (order_id, product_id, quantity, price)
- **products**: Product details (id, name, description, price, currency, type)

### Relationships:
- `orders.id` → `order_products.order_id` (1:many)
- `products.id` → `order_products.product_id` (1:many)

## Implementation Steps

### 1. Create Order Detail Page Route
- **File**: `pages/admin/event/[id]/orders/[orderId].vue`
- **Route**: `/admin/event/[eventId]/orders/[orderId]`
- **Layout**: `admin-event` (consistent with other admin pages)

### 2. Data Fetching Strategy
- Fetch order details with related data using Supabase joins
- Query structure:
  ```sql
  SELECT 
    orders.*,
    order_products.quantity,
    order_products.price as unit_price,
    products.name as product_name,
    products.description as product_description,
    products.type as product_type
  FROM orders 
  LEFT JOIN order_products ON orders.id = order_products.order_id
  LEFT JOIN products ON order_products.product_id = products.id
  WHERE orders.id = [orderId] AND orders.entity_id = [eventId]
  ```

### 3. Page Components Structure

#### Header Section
- Order ID (prominent display)
- Back button to orders list
- Order status badge with color coding
- Created date

#### Order Summary Card
- **Customer Information**:
  - Buyer email
  - User ID (if available)
- **Payment Information**:
  - Total amount with currency formatting
  - Payment provider
  - Provider order ID
  - Status with visual indicators
- **Timestamps**:
  - Created at
  - Refunded at (if applicable)

#### Products Table
- **Columns**:
  - Product Name
  - Product Type (if available)
  - Quantity
  - Unit Price
  - Total Price (quantity × unit_price)
- **Features**:
  - Responsive design
  - Consistent styling with orders table
  - Proper currency formatting

#### Additional Features
- **Copy functionality** for order ID and buyer email (similar to orders list)
- **Loading states** and error handling
- **Responsive design** for mobile devices

### 4. Navigation Enhancement
- Make order rows in the orders list clickable
- Add hover effects to indicate clickability
- Use `navigateTo()` or `router.push()` for navigation

### 5. Styling Guidelines
- Follow the established Tailwind CSS design system
- Use consistent card layouts and typography
- Implement proper spacing and color schemes
- Ensure accessibility with proper contrast ratios

### 6. Error Handling
- **Order not found**: Display appropriate message
- **Permission denied**: Check user permissions for the event
- **Network errors**: Show retry functionality
- **Loading states**: Skeleton or spinner components

### 7. Security Considerations
- Verify user has permission to view the specific event's orders
- Validate order belongs to the specified event
- Implement proper authentication checks

## Additional Features to Consider

### Essential Features:
1. **Back Navigation**: Button to return to orders list
2. **Order Status Updates**: Visual indicators for different statuses
3. **Refund Information**: Display refund details if applicable
4. **Print/Export**: Option to print or export order details

### Nice-to-Have Features:
1. **Order Timeline**: Show order progression (created → paid → fulfilled)
2. **Customer Communication**: Link to send emails to buyer
3. **Order Actions**: Refund, cancel, or modify order capabilities
4. **Related Orders**: Show other orders from the same customer
5. **Analytics Integration**: Track page views and user interactions
6. **Audit Log**: Show order modification history

### Future Enhancements:
1. **Real-time Updates**: WebSocket connection for live order status updates
2. **Bulk Operations**: Select multiple products for batch actions
3. **Advanced Filtering**: Filter products by type, price range, etc.
4. **Integration with Ticketing**: Link to generated tickets for the order
5. **Customer Profile**: Deep link to customer's full profile and order history

## Technical Implementation Notes

### Supabase Queries:
- Use `select()` with joins to minimize API calls
- Implement proper error handling for database operations
- Consider caching strategies for frequently accessed data

### Performance Considerations:
- Lazy load heavy components
- Implement proper loading states
- Use computed properties for calculated values
- Optimize re-renders with proper key usage

### Accessibility:
- Proper ARIA labels for interactive elements
- Keyboard navigation support
- Screen reader compatibility
- High contrast color schemes

## File Structure:
```
pages/admin/event/[id]/orders/
├── index.vue (existing orders list)
└── [orderId].vue (new order detail page)
```

## Dependencies:
- Existing Supabase client configuration
- Tailwind CSS for styling
- Vue 3 composition API
- Nuxt 3 routing system

This implementation will provide a comprehensive order management interface that enhances the admin user experience while maintaining consistency with the existing design system.
