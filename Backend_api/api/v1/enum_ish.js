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
  dessert: 'DESSERT',
  salad: 'SALAD',
  breakfast: 'BREAKFAST',
  lunch: 'LUNCH',
  dinner: 'DINNER',
};

const food_measurement = {
  plate: 'PLATE',
  serving: 'SERVING',
  cup: 'CUP',
  pack: 'PACK',
  piece: 'PIECE',
}

const Note_Status = {
  sent: 'SENT',
  received: 'RECEIVED',
  read: 'READ',
};

const Order_Status = {
  ready: 'READY',
  completed: 'COMPLETED',
  cancelled: 'CANCELLED',
  Disputed: 'DISPUTED',
  Resolved: 'RESOLVED',
  pending_transaction: 'PENDING TRANSACTION',
  in_cart: 'IN CART',
};

const Pre_order_Status = {
  created: 'CREATED',
  cancelled: 'CANCELLED',
  disputed: 'DISPUTED',
  resolved: 'RESOLVED',
  checked_out: 'CHECKED OUT',
  picked_up: 'PICKED UP',
  delivered: 'DELIVERED',
};

const Transaction_Status = {
  initiated: 'INITIATED',
  waiting_on_confirmation: 'WOC',
  successful: 'SUCCESSFUL',
  failed: 'FAILED',
  dispute: 'DISPUTE',
  resolved: 'DISPUTE RESOLVED',
  cancelled: 'CANCELLED',
};

const Transaction_type = {
  credit: 'CREDIT',
  debit: 'DEBIT',
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
};

const Time_share = {
  hour: 60 * 60 * 1000,
  day: 24 * 60 * 60 * 1000,
  minute: 60 * 60 * 1000,
  week: 7 * 24 * 60 * 60 * 1000,
  month: 30 * 24 * 60 * 60 * 1000,
  year: 365 * 24 * 60 * 60 * 1000,
};

const Time_Directory = {
  future: 'future',
  past: 'past',
};

const States = {
  lagos: 'Lagos',
  abuja: 'Abuja',
  oyo: 'Oyo',
  ondo: 'Ondo',
};

const Country = {
  nigeria: 'Nigeria',
};

const Events = {
  add: 'ADD',
  remove: 'REMOVE',
  overwrite: 'OVERWRITE',
  clear: 'CLEAR',
};

const userStatus = {
  active: 'ACTIVE',
  deactivated: 'DEACTIVATED',
  banned: 'BANNED',
  deleted: 'DELETED',
};

const payFor = {
  all: 'ALL',
  all_orders: 'ALL ORDERS',
  orders: 'ORDERS',
  all_preOrders: 'ALL PRE ORDERS',
  preOrders: 'PRE ORDERS',
};

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
  Shipemnt_status,
  States,
  Time_share,
  Time_Directory,
  Events,
  userStatus,
  Country,
  Transaction_type,
  payFor,
  food_measurement,
};
