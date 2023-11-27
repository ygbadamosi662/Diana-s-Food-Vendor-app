const Role = {
  user: 'USER',
  admin: 'ADMIN',
  super_admin: 'SUPER ADMIN',
};

const Gender = {
  male: "MALE",
  female: "FEMALE",
  other: "OTHER",
};

const Type = { 
  soup: 'SOUP',
  pastry: 'PATRY',
  pasta: 'PASTA',
  pizza: 'PIZZA',
  snacks: 'SNACKS',
  rice: 'RICE',
  food: 'FOOD',
};

const Note_Status = {
  sent: 'SENT',
  received: 'RECEIVED',
  read: 'READ',
  not_read: "Not Read" // used to get not read notifications
};

const Order_Status = {
  otw: 'OTW',
  ready: 'READY',
  completed: 'COMPLETED',
  cancelled: 'CANCELLED',
  pending_transaction: 'PENDING TRANSACTION',
  in_cart: 'IN CART',
};

const Pre_order_Status = {
  created: 'CREATED',
  cancelled: 'CANCELLED',
  checked_out: 'CHECKED OUT',
  otw: 'OTW',
  completed: 'COMPLETED',
};

const Transaction_Status = {
  waiting_on_confirmation: 'WOC',
  successful: 'SUCCESSFUL',
  failed: 'FAILED',
  dispute: 'DISPUTE',
  resolved: 'DISPUTE RESOLVED',
};

const Is_Verified = {
  verified: 'VERIFIED',
  not_verified: 'NOT VERIFIED',
};

const Collections = {
  User: 'User',
  Food: 'Food',
  Review: 'Review',
  Notification: 'Notification',
  Order: 'Order',
  Transaction: 'Transaction',
  Shipment: 'Shipment',
  Address: 'Address',
};

const Order_type = {
  delivery: 'DELIVERY',
  pickup: 'PICKUP',
};

const Power = {
  on: 'ON',
  off: 'OFF',
};

const Schedule_type = {
  daily: 'DAILY',
  weekly: 'WEEKLY',
  monthly: 'MONTHLY',
  one_off: 'ONE OFF',
};

const Where = {
  home: 'HOME',
  work: 'WORK',
  other: 'OTHER',
};

const Shipemnt_status = {
  pending: 'PENDING',
  in_transit: 'IN TRANSIT',
  delivered: 'DELIVERED',
}

module.exports = { 
  Order_type, 
  Role, 
  Type, 
  Is_Verified, 
  Collections, 
  Power, 
  Gender, 
  Note_Status, 
  Order_Status, 
  Transaction_Status,
  Schedule_type,
  Pre_order_Status,
  Where,
  Shipemnt_status
};
