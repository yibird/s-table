/**
 * 文档示例共享数据工具。
 *
 * 提供通用的数据类型、数据生成器和分类映射，
 * 减少各 demo 中重复的 mock 数据代码。
 */

// ==================== 通用数据类型 ====================

/** 员工数据（最常用的 demo 数据模型）。 */
export interface Employee {
  id: number;
  name: string;
  age: number;
  city: string;
  email: string;
  department: string;
  salary: number;
  joinDate: string;
  address: string;
}

/** 订单数据（用于过滤、排序等数据操作 demo）。 */
export interface Order {
  id: number;
  product: string;
  amount: number;
  status: 'pending' | 'shipped' | 'delivered' | 'cancelled';
  category: 'electronics' | 'clothing' | 'food' | 'books';
  region: 'north' | 'south' | 'east' | 'west';
  date: string;
}

// ==================== 数据池 ====================

export const NAMES = ['张三', '李四', '王五', '赵六', '钱七', '孙八', '周九', '吴十'];

export const DEPARTMENTS = ['技术部', '产品部', '设计部', '市场部'];

export const CITIES = ['北京', '上海', '杭州', '深圳', '广州', '成都', '武汉', '南京'];

export const PRODUCTS = [
  '笔记本电脑',
  '无线耳机',
  'T恤衫',
  '咖啡豆',
  'TypeScript实战',
  '机械键盘',
  '运动外套',
  '坚果礼盒',
];

export const STATUSES = ['pending', 'shipped', 'delivered', 'cancelled'] as const;

export const CATEGORIES = ['electronics', 'clothing', 'food', 'books'] as const;

export const REGIONS = ['north', 'south', 'east', 'west'] as const;

// ==================== 数据生成器 ====================

/** 生成员工数据。 */
export const generateEmployees = (count: number): Employee[] =>
  Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    name: `${NAMES[i % NAMES.length]}${i + 1}`,
    age: 22 + (i % 20),
    city: CITIES[i % CITIES.length],
    email: `employee${i + 1}@example.com`,
    department: DEPARTMENTS[i % DEPARTMENTS.length],
    salary: 8000 + ((i * 500) % 25000),
    joinDate: `20${18 + (i % 6)}-${String((i % 12) + 1).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}`,
    address: `${CITIES[i % CITIES.length]}市XX区${i + 1}号`,
  }));

/** 生成订单数据。 */
export const generateOrders = (count: number): Order[] =>
  Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    product: PRODUCTS[i % PRODUCTS.length],
    amount: 50 + ((i * 337) % 8000),
    status: STATUSES[i % STATUSES.length],
    category: CATEGORIES[i % CATEGORIES.length],
    region: REGIONS[i % REGIONS.length],
    date: `2024-${String((i % 12) + 1).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}`,
  }));

// ==================== 状态/分类中文映射 ====================

export const STATUS_LABELS: Record<Order['status'], string> = {
  pending: '待发货',
  shipped: '已发货',
  delivered: '已完成',
  cancelled: '已取消',
};

export const CATEGORY_LABELS: Record<Order['category'], string> = {
  electronics: '电子产品',
  clothing: '服饰',
  food: '食品',
  books: '图书',
};

export const REGION_LABELS: Record<Order['region'], string> = {
  north: '华北',
  south: '华南',
  east: '华东',
  west: '华西',
};
