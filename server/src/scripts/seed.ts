import bcrypt from 'bcryptjs';

import { logger } from '../common/middleware/requestLogger';
import { addDays } from '../common/utils/dateHelpers';
import { AuthorModel } from '../models/Author.model';
import { AuditLogModel } from '../models/AuditLog.model';
import { BookModel } from '../models/Book.model';
import { BookCopyModel } from '../models/BookCopy.model';
import { CategoryModel } from '../models/Category.model';
import { FineRateModel } from '../models/FineRate.model';
import { FineRecordModel } from '../models/FineRecord.model';
import { LoanPolicyModel } from '../models/LoanPolicy.model';
import { LoanRecordModel } from '../models/LoanRecord.model';
import { MemberModel } from '../models/Member.model';
import { NotificationLogModel } from '../models/NotificationLog.model';
import { RefreshTokenModel } from '../models/RefreshToken.model';
import { ReservationModel } from '../models/Reservation.model';
import { closeDatabaseConnection, connectToDatabase } from '../config/database';
import {
  CopyStatus,
  FineStatus,
  LoanStatus,
  MemberStatus,
  ReservationStatus,
  Role,
} from '../common/types/enums';

const EFFECTIVE_FROM = new Date('2026-01-01T00:00:00.000Z');
const DEMO_NOW = new Date('2026-05-06T09:00:00.000Z');
const DEFAULT_ADMIN_EMAIL = 'admin@library.edu';
const DEFAULT_ADMIN_PASSWORD = 'Admin123!';
const DEFAULT_ADMIN_CARD_NO = 'MEM-2026-00001';
const DEFAULT_PASSWORD = 'Passw0rd!';

interface DemoMemberSeed {
  email: string;
  fullName: string;
  role: Role;
  cardNo: string;
  studentId?: string;
  faculty?: string;
  className?: string;
  phone?: string;
  campus?: string;
  libraryBranch?: string;
  membershipTier?: string;
}

interface BookSeed {
  isbn: string;
  title: string;
  authors: string[];
  categories: string[];
  publisher: string;
  publishYear: number;
  bookValue: number;
  copies: number;
  description?: string;
  language?: string;
  pageCount?: number;
  bookSize?: string;
}

interface CopyRef {
  copyId: string;
  bookId: string;
}

const STUDENT_NAMES = [
  'Nguyễn Minh Anh',
  'Trần Gia Bảo',
  'Lê Hoàng Long',
  'Phạm Ngọc Mai',
  'Hoàng Minh Châu',
  'Vũ Đức Anh',
  'Đặng Quốc Bảo',
  'Bùi Khánh Linh',
  'Đỗ Nhật Minh',
  'Ngô Thanh Tùng',
  'Dương Hải Yến',
  'Phan Tuấn Kiệt',
  'Trịnh Hà My',
  'Võ Minh Quân',
  'Lý Phương Thảo',
  'Mai Đức Huy',
  'Cao Thu Trang',
  'Hồ Gia Hân',
  'Tạ Quang Huy',
  'Chu Bảo Ngọc',
  'Nguyễn Thành Đạt',
  'Trần Khánh Vy',
  'Lê Anh Khoa',
  'Phạm Quỳnh Anh',
  'Hoàng Tuấn Anh',
  'Vũ Ngọc Ánh',
  'Đặng Minh Triết',
  'Bùi Lan Anh',
  'Đỗ Hải Nam',
  'Ngô Phương Uyên',
] as const;

const FACULTY_ROTATION = [
  { faculty: 'Khoa Công nghệ Thông tin', className: 'CNTT-K65' },
  { faculty: 'Khoa Kinh tế', className: 'KTE-K65' },
  { faculty: 'Khoa Ngoại ngữ', className: 'NN-K65' },
  { faculty: 'Khoa Luật', className: 'LKT-K65' },
  { faculty: 'Khoa Quản trị Kinh doanh', className: 'QTKD-K65' },
] as const;

const STUDENT_MEMBERS: DemoMemberSeed[] = STUDENT_NAMES.map((fullName, index) => {
  const major = FACULTY_ROTATION[index % FACULTY_ROTATION.length];

  return {
    email: `student${String(index + 1).padStart(3, '0')}@library.edu`,
    fullName,
    role: Role.Student,
    cardNo: `MEM-2026-10${String(index + 1).padStart(3, '0')}`,
    studentId: `2221050${String(index + 1).padStart(3, '0')}`,
    faculty: major.faculty,
    className: major.className,
    phone: `09${String(32000000 + index).padStart(8, '0')}`,
    campus: index % 2 === 0 ? 'Cơ sở 1' : 'Cơ sở 2',
    libraryBranch: index % 2 === 0 ? 'Thư viện Trung tâm' : 'Thư viện Cơ sở 2',
    membershipTier: index % 5 === 0 ? 'priority' : 'standard',
  };
});

const LECTURER_MEMBERS: DemoMemberSeed[] = [
  ['TS. Nguyễn Đức Thành', 'Khoa Công nghệ Thông tin'],
  ['ThS. Trần Thu Hà', 'Khoa Kinh tế'],
  ['TS. Lê Minh Quang', 'Khoa Luật'],
  ['ThS. Phạm Hồng Nhung', 'Khoa Ngoại ngữ'],
  ['TS. Hoàng Anh Tuấn', 'Khoa Quản trị Kinh doanh'],
].map(([fullName, faculty], index) => ({
  email: `lecturer${index + 1}@library.edu`,
  fullName,
  role: Role.Lecturer,
  cardNo: `MEM-2026-02${String(index + 1).padStart(3, '0')}`,
  faculty,
  phone: `08${String(88000000 + index).padStart(8, '0')}`,
  campus: 'Cơ sở 1',
  libraryBranch: 'Thư viện Trung tâm',
  membershipTier: 'faculty',
}));

const LIBRARIAN_MEMBERS: DemoMemberSeed[] = [
  {
    email: 'librarian1@library.edu',
    fullName: 'Nguyễn Thủ Thư',
    role: Role.Librarian,
    cardNo: 'MEM-2026-03001',
    phone: '0901000001',
    campus: 'Cơ sở 1',
    libraryBranch: 'Thư viện Trung tâm',
    membershipTier: 'staff',
  },
  {
    email: 'librarian2@library.edu',
    fullName: 'Trần Quản Thư',
    role: Role.Librarian,
    cardNo: 'MEM-2026-03002',
    phone: '0901000002',
    campus: 'Cơ sở 2',
    libraryBranch: 'Thư viện Cơ sở 2',
    membershipTier: 'staff',
  },
];

const DEMO_MEMBERS: DemoMemberSeed[] = [
  ...LIBRARIAN_MEMBERS,
  ...LECTURER_MEMBERS,
  ...STUDENT_MEMBERS,
];

const CATEGORIES = [
  'Công nghệ Thông tin',
  'Khoa học Máy tính',
  'Kỹ thuật phần mềm',
  'Trí tuệ Nhân tạo',
  'Văn học',
  'Kinh tế',
  'Lịch sử',
  'Thiếu nhi',
  'Tâm lý - Kỹ năng',
  'Khoa học viễn tưởng',
];

const AUTHORS = [
  { name: 'Robert C. Martin', bio: 'Tác giả Clean Code, Clean Architecture.' },
  { name: 'Martin Fowler', bio: 'Chuyên gia refactoring và kiến trúc phần mềm.' },
  { name: 'Andrew Ng', bio: 'Đồng sáng lập Coursera, chuyên gia Machine Learning.' },
  { name: 'Donald Knuth', bio: 'Tác giả The Art of Computer Programming.' },
  { name: 'Eric Evans', bio: 'Cha đẻ Domain-Driven Design.' },
  { name: 'Nguyễn Nhật Ánh', bio: 'Nhà văn Việt Nam nổi tiếng với truyện thiếu nhi.' },
  { name: 'Tô Hoài', bio: 'Nhà văn Việt Nam, tác giả Dế Mèn phiêu lưu ký.' },
  { name: 'Yuval Noah Harari', bio: 'Nhà sử học, tác giả Sapiens.' },
  { name: 'Adam Smith', bio: 'Nhà kinh tế học, tác giả The Wealth of Nations.' },
  { name: 'Stuart Russell', bio: 'Đồng tác giả Artificial Intelligence: A Modern Approach.' },
  { name: 'James Clear', bio: 'Tác giả Atomic Habits.' },
  { name: 'Paulo Coelho', bio: 'Tiểu thuyết gia Brazil, tác giả Nhà giả kim.' },
  { name: 'Dale Carnegie', bio: 'Tác giả Đắc nhân tâm.' },
  { name: 'Frank Herbert', bio: 'Tác giả Dune.' },
  { name: 'Daniel Kahneman', bio: 'Nhà tâm lý học, tác giả Thinking, Fast and Slow.' },
  { name: 'David J. Lieberman', bio: 'Tác giả các sách tâm lý ứng dụng.' },
  { name: 'Nick Trenton', bio: 'Tác giả sách về tư duy và quản trị cảm xúc.' },
  { name: 'Richard Paul', bio: 'Tác giả sách về tư duy phản biện.' },
];

const BOOKS: BookSeed[] = [
  {
    isbn: '9780132350884',
    title: 'Clean Code: A Handbook of Agile Software Craftsmanship',
    authors: ['Robert C. Martin'],
    categories: ['Kỹ thuật phần mềm', 'Công nghệ Thông tin'],
    publisher: 'Prentice Hall',
    publishYear: 2008,
    bookValue: 450000,
    copies: 4,
    description: 'Cẩm nang viết mã sạch theo phong cách Agile.',
    language: 'Tiếng Anh',
    pageCount: 464,
  },
  {
    isbn: '9780134494166',
    title: 'Clean Architecture',
    authors: ['Robert C. Martin'],
    categories: ['Kỹ thuật phần mềm'],
    publisher: 'Prentice Hall',
    publishYear: 2017,
    bookValue: 520000,
    copies: 3,
    description: 'Hướng dẫn thiết kế kiến trúc phần mềm bền vững.',
    language: 'Tiếng Anh',
    pageCount: 432,
  },
  {
    isbn: '9780201485677',
    title: 'Refactoring: Improving the Design of Existing Code',
    authors: ['Martin Fowler'],
    categories: ['Kỹ thuật phần mềm'],
    publisher: 'Addison-Wesley',
    publishYear: 1999,
    bookValue: 480000,
    copies: 3,
    description: 'Kỹ thuật refactor mã nguồn an toàn.',
    language: 'Tiếng Anh',
    pageCount: 448,
  },
  {
    isbn: '9780321125217',
    title: 'Domain-Driven Design',
    authors: ['Eric Evans'],
    categories: ['Kỹ thuật phần mềm'],
    publisher: 'Addison-Wesley',
    publishYear: 2003,
    bookValue: 600000,
    copies: 2,
    description: 'Mô hình hóa nghiệp vụ phức tạp theo DDD.',
    language: 'Tiếng Anh',
    pageCount: 560,
  },
  {
    isbn: '9780321751041',
    title: 'The Art of Computer Programming, Vol. 1',
    authors: ['Donald Knuth'],
    categories: ['Khoa học Máy tính'],
    publisher: 'Addison-Wesley',
    publishYear: 2011,
    bookValue: 1200000,
    copies: 2,
    language: 'Tiếng Anh',
    pageCount: 672,
  },
  {
    isbn: '9780134610993',
    title: 'Artificial Intelligence: A Modern Approach',
    authors: ['Stuart Russell'],
    categories: ['Trí tuệ Nhân tạo', 'Khoa học Máy tính'],
    publisher: 'Pearson',
    publishYear: 2020,
    bookValue: 950000,
    copies: 3,
    language: 'Tiếng Anh',
    pageCount: 1168,
  },
  {
    isbn: '9781492032649',
    title: 'Machine Learning Yearning',
    authors: ['Andrew Ng'],
    categories: ['Trí tuệ Nhân tạo'],
    publisher: 'deeplearning.ai',
    publishYear: 2018,
    bookValue: 350000,
    copies: 5,
    language: 'Tiếng Anh',
    pageCount: 118,
  },
  {
    isbn: '9780062316097',
    title: 'Sapiens: Lược sử loài người',
    authors: ['Yuval Noah Harari'],
    categories: ['Lịch sử'],
    publisher: 'Harper',
    publishYear: 2014,
    bookValue: 320000,
    copies: 4,
    pageCount: 512,
  },
  {
    isbn: '9780199535927',
    title: 'The Wealth of Nations',
    authors: ['Adam Smith'],
    categories: ['Kinh tế'],
    publisher: 'Oxford University Press',
    publishYear: 2008,
    bookValue: 280000,
    copies: 2,
    language: 'Tiếng Anh',
    pageCount: 688,
  },
  {
    isbn: '9786041135222',
    title: 'Cho tôi xin một vé đi tuổi thơ',
    authors: ['Nguyễn Nhật Ánh'],
    categories: ['Văn học', 'Thiếu nhi'],
    publisher: 'NXB Trẻ',
    publishYear: 2008,
    bookValue: 95000,
    copies: 6,
    pageCount: 208,
  },
  {
    isbn: '9786041175327',
    title: 'Mắt biếc',
    authors: ['Nguyễn Nhật Ánh'],
    categories: ['Văn học'],
    publisher: 'NXB Trẻ',
    publishYear: 1990,
    bookValue: 120000,
    copies: 5,
    pageCount: 300,
  },
  {
    isbn: '9786042091237',
    title: 'Dế Mèn phiêu lưu ký',
    authors: ['Tô Hoài'],
    categories: ['Văn học', 'Thiếu nhi'],
    publisher: 'Kim Đồng',
    publishYear: 1941,
    bookValue: 80000,
    copies: 5,
    pageCount: 168,
  },
  {
    isbn: '9786043788464',
    title: 'Atomic Habits: Thay đổi tí hon hiệu quả bất ngờ',
    authors: ['James Clear'],
    categories: ['Tâm lý - Kỹ năng'],
    publisher: 'NXB Lao động',
    publishYear: 2021,
    bookValue: 180000,
    copies: 6,
    pageCount: 320,
  },
  {
    isbn: '9786047795925',
    title: 'Nhà giả kim',
    authors: ['Paulo Coelho'],
    categories: ['Văn học'],
    publisher: 'NXB Văn học',
    publishYear: 2020,
    bookValue: 79000,
    copies: 4,
    pageCount: 228,
  },
  {
    isbn: '9786043230116',
    title: 'Đắc nhân tâm',
    authors: ['Dale Carnegie'],
    categories: ['Tâm lý - Kỹ năng'],
    publisher: 'NXB Tổng hợp TP.HCM',
    publishYear: 2018,
    bookValue: 110000,
    copies: 5,
    pageCount: 320,
  },
  {
    isbn: '9780441172719',
    title: 'Dune - Xứ Cát',
    authors: ['Frank Herbert'],
    categories: ['Khoa học viễn tưởng'],
    publisher: 'Ace',
    publishYear: 1965,
    bookValue: 260000,
    copies: 4,
    pageCount: 688,
  },
  {
    isbn: '9786043441178',
    title: 'Tư duy nhanh và chậm',
    authors: ['Daniel Kahneman'],
    categories: ['Tâm lý - Kỹ năng'],
    publisher: 'NXB Thế giới',
    publishYear: 2022,
    bookValue: 269000,
    copies: 4,
    pageCount: 612,
  },
  {
    isbn: '9786043928433',
    title: 'Đọc vị bất kỳ ai',
    authors: ['David J. Lieberman'],
    categories: ['Tâm lý - Kỹ năng'],
    publisher: 'NXB Lao động',
    publishYear: 2023,
    bookValue: 159000,
    copies: 3,
    pageCount: 304,
  },
  {
    isbn: '9786043928440',
    title: 'Nghĩ nhiều làm ít',
    authors: ['Nick Trenton'],
    categories: ['Tâm lý - Kỹ năng'],
    publisher: 'NXB Lao động',
    publishYear: 2023,
    bookValue: 145000,
    copies: 3,
    pageCount: 288,
  },
  {
    isbn: '9781538139504',
    title: 'Bộ công cụ tư duy phản biện',
    authors: ['Richard Paul'],
    categories: ['Tâm lý - Kỹ năng'],
    publisher: 'Rowman & Littlefield',
    publishYear: 2019,
    bookValue: 210000,
    copies: 3,
    language: 'Tiếng Anh',
    pageCount: 416,
  },
];

const allModels = [
  CategoryModel,
  AuthorModel,
  BookModel,
  BookCopyModel,
  MemberModel,
  LoanPolicyModel,
  LoanRecordModel,
  ReservationModel,
  FineRecordModel,
  FineRateModel,
  RefreshTokenModel,
  AuditLogModel,
  NotificationLogModel,
] as const;

async function dropLegacyTextIndex(): Promise<void> {
  try {
    await BookModel.collection.dropIndex('title_text_isbn_text');
  } catch (error: unknown) {
    const code = typeof error === 'object' && error !== null && 'codeName' in error ? error.codeName : undefined;
    if (code !== 'IndexNotFound') {
      throw error;
    }
  }
}

async function ensureIndexes(): Promise<void> {
  await dropLegacyTextIndex();
  await Promise.all(allModels.map(async (mongooseModel) => mongooseModel.init()));
}

async function seedLoanPolicies(): Promise<void> {
  const policies = [
    {
      role: Role.Student,
      maxBooks: 3,
      loanDays: 14,
      maxRenewals: 1,
      renewDays: 7,
      effectiveFrom: EFFECTIVE_FROM,
    },
    {
      role: Role.Lecturer,
      maxBooks: 5,
      loanDays: 30,
      maxRenewals: 2,
      renewDays: 14,
      effectiveFrom: EFFECTIVE_FROM,
    },
    {
      role: Role.Librarian,
      maxBooks: 10,
      loanDays: 60,
      maxRenewals: 0,
      renewDays: 14,
      effectiveFrom: EFFECTIVE_FROM,
    },
  ] as const;

  await Promise.all(
    policies.map(async (policy) =>
      LoanPolicyModel.updateOne(
        { role: policy.role },
        {
          $set: {
            maxBooks: policy.maxBooks,
            loanDays: policy.loanDays,
            maxRenewals: policy.maxRenewals,
            renewDays: policy.renewDays,
            effectiveFrom: policy.effectiveFrom,
          },
        },
        { upsert: true },
      ),
    ),
  );
}

async function seedFineRate(): Promise<void> {
  await FineRateModel.updateOne(
    { appliesTo: 'all', effectiveFrom: EFFECTIVE_FROM },
    {
      $set: {
        ratePerDay: 5000,
      },
    },
    { upsert: true },
  );
}

async function upsertMember(seed: DemoMemberSeed & { password: string }): Promise<string> {
  const passwordHash = await bcrypt.hash(seed.password, 12);
  const joinDate = EFFECTIVE_FROM;
  const expiryDate = addDays(joinDate, 365);
  const identityFilters: Array<Record<string, string>> = [
    { email: seed.email },
    { memberCardNo: seed.cardNo },
  ];

  if (seed.studentId) {
    identityFilters.push({ studentId: seed.studentId });
  }

  const existing = await MemberModel.findOne({ $or: identityFilters }).exec();
  if (!existing) {
    const created = await MemberModel.create({
      fullName: seed.fullName,
      email: seed.email,
      passwordHash,
      role: seed.role,
      memberCardNo: seed.cardNo,
      status: MemberStatus.Active,
      isBlocked: false,
      failedLoginCount: 0,
      lockedUntil: null,
      joinDate,
      expiryDate,
      studentId: seed.studentId,
      faculty: seed.faculty,
      className: seed.className,
      phone: seed.phone,
      campus: seed.campus,
      libraryBranch: seed.libraryBranch,
      membershipTier: seed.membershipTier,
      lastLoginAt: addDays(DEMO_NOW, -2),
      passwordUpdatedAt: EFFECTIVE_FROM,
    });
    return created._id.toString();
  }

  existing.fullName = seed.fullName;
  existing.email = seed.email;
  existing.passwordHash = passwordHash;
  existing.role = seed.role;
  existing.memberCardNo = seed.cardNo;
  existing.status = MemberStatus.Active;
  existing.isBlocked = false;
  existing.failedLoginCount = 0;
  existing.lockedUntil = null;
  existing.joinDate = existing.joinDate ?? joinDate;
  existing.expiryDate = existing.expiryDate ?? expiryDate;
  existing.studentId = seed.studentId;
  existing.faculty = seed.faculty;
  existing.className = seed.className;
  existing.phone = seed.phone;
  existing.campus = seed.campus;
  existing.libraryBranch = seed.libraryBranch;
  existing.membershipTier = seed.membershipTier;
  existing.lastLoginAt = addDays(DEMO_NOW, -2);
  existing.passwordUpdatedAt = existing.passwordUpdatedAt ?? EFFECTIVE_FROM;
  await existing.save();

  return existing._id.toString();
}

async function seedAdminUser(): Promise<string> {
  return upsertMember({
    email: DEFAULT_ADMIN_EMAIL,
    fullName: 'System Administrator',
    role: Role.Admin,
    cardNo: DEFAULT_ADMIN_CARD_NO,
    password: DEFAULT_ADMIN_PASSWORD,
    phone: '0900000000',
    campus: 'Cơ sở 1',
    libraryBranch: 'Thư viện Trung tâm',
    membershipTier: 'admin',
  });
}

async function seedDemoMembers(): Promise<Map<string, string>> {
  const map = new Map<string, string>();

  for (const m of DEMO_MEMBERS) {
    const id = await upsertMember({
      ...m,
      password: DEFAULT_PASSWORD,
    });
    map.set(m.email, id);
  }

  return map;
}

async function seedCategories(): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  for (const name of CATEGORIES) {
    const doc = await CategoryModel.findOneAndUpdate(
      { name },
      { $setOnInsert: { name, parentId: null } },
      { upsert: true, new: true },
    ).exec();
    map.set(name, doc._id.toString());
  }
  return map;
}

async function seedAuthors(): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  for (const a of AUTHORS) {
    const doc = await AuthorModel.findOneAndUpdate(
      { name: a.name },
      { $set: { bio: a.bio }, $setOnInsert: { name: a.name } },
      { upsert: true, new: true },
    ).exec();
    map.set(a.name, doc._id.toString());
  }
  return map;
}

async function seedBooksAndCopies(
  categoryMap: Map<string, string>,
  authorMap: Map<string, string>,
): Promise<void> {
  for (const b of BOOKS) {
    const authorIds = b.authors
      .map((name) => authorMap.get(name))
      .filter((id): id is string => Boolean(id));
    const categoryIds = b.categories
      .map((name) => categoryMap.get(name))
      .filter((id): id is string => Boolean(id));

    const book = await BookModel.findOneAndUpdate(
      { isbn: b.isbn },
      {
        $set: {
          title: b.title,
          authorIds,
          categoryIds,
          publisher: b.publisher,
          publishYear: b.publishYear,
          bookValue: b.bookValue,
          description: b.description,
          language: b.language ?? 'Tiếng Việt',
          pageCount: b.pageCount ?? 320,
          bookSize: b.bookSize ?? '15.5 x 23 cm',
          isDeleted: false,
        },
        $setOnInsert: { isbn: b.isbn },
      },
      { upsert: true, new: true },
    ).exec();

    const existingCopies = await BookCopyModel.countDocuments({ bookId: book._id }).exec();
    const missing = b.copies - existingCopies;
    if (missing > 0) {
      const docs = Array.from({ length: missing }, (_, i) => ({
        bookId: book._id,
        barcode: `${b.isbn}-C${String(existingCopies + i + 1).padStart(3, '0')}`,
        status: CopyStatus.Available,
        shelfLocation: `K${String(book._id).slice(-2).toUpperCase()}-${existingCopies + i + 1}`,
        acquiredDate: EFFECTIVE_FROM,
      }));
      await BookCopyModel.insertMany(docs);
    }
  }
}

async function resetDemoOperationalData(): Promise<void> {
  await Promise.all([
    LoanRecordModel.deleteMany({}),
    ReservationModel.deleteMany({}),
    FineRecordModel.deleteMany({}),
    NotificationLogModel.deleteMany({}),
    AuditLogModel.deleteMany({}),
    RefreshTokenModel.deleteMany({}),
  ]);

  await BookCopyModel.updateMany({}, { $set: { status: CopyStatus.Available } }).exec();
  await MemberModel.updateMany(
    { email: { $in: STUDENT_MEMBERS.map((student) => student.email) } },
    {
      $set: {
        status: MemberStatus.Active,
        isBlocked: false,
        failedLoginCount: 0,
        lockedUntil: null,
      },
    },
  ).exec();
}

async function buildCopyAllocator(): Promise<() => CopyRef> {
  const copies = await BookCopyModel.find({ status: CopyStatus.Available }).sort({ barcode: 1 }).exec();
  let cursor = 0;

  return () => {
    const copy = copies[cursor];
    cursor += 1;

    if (!copy) {
      throw new Error('Seed needs more book copies to create demo loan/reservation scenarios.');
    }

    return {
      copyId: copy._id.toString(),
      bookId: copy.bookId.toString(),
    };
  };
}

async function createLoan(params: {
  memberId: string;
  copy: CopyRef;
  checkoutDate: Date;
  dueDate: Date;
  status: LoanStatus;
  returnDate?: Date;
  renewCount?: number;
  notes?: string;
}): Promise<string> {
  const loan = await LoanRecordModel.create({
    memberId: params.memberId,
    copyId: params.copy.copyId,
    bookId: params.copy.bookId,
    checkoutDate: params.checkoutDate,
    dueDate: params.dueDate,
    returnDate: params.returnDate,
    status: params.status,
    renewCount: params.renewCount ?? 0,
    policyLoanDays: 14,
    policyMaxRenewals: 1,
    policyRenewDays: 7,
    notes: params.notes,
  });

  const copyStatus =
    params.status === LoanStatus.Returned
      ? CopyStatus.Available
      : params.status === LoanStatus.Lost
        ? CopyStatus.Lost
        : CopyStatus.Borrowed;

  await BookCopyModel.findByIdAndUpdate(params.copy.copyId, { $set: { status: copyStatus } }).exec();

  return loan._id.toString();
}

async function createFine(params: {
  loanId: string;
  memberId: string;
  overdueDate: Date;
  amount: number;
  status: FineStatus;
  paidAt?: Date;
  waivedBy?: string;
  note: string;
}): Promise<void> {
  await FineRecordModel.create({
    loanId: params.loanId,
    memberId: params.memberId,
    overdueDate: params.overdueDate,
    amount: params.amount,
    status: params.status,
    paidAt: params.paidAt,
    waivedBy: params.waivedBy,
    note: params.note,
  });
}

function getRequiredMemberId(memberMap: Map<string, string>, email: string): string {
  const memberId = memberMap.get(email);
  if (!memberId) {
    throw new Error(`Missing seeded member ${email}`);
  }
  return memberId;
}

async function seedOperationalScenarios(memberMap: Map<string, string>, librarianId: string): Promise<void> {
  const nextCopy = await buildCopyAllocator();
  const books = await BookModel.find({ isDeleted: false }).sort({ title: 1 }).exec();

  if (books.length === 0) {
    throw new Error('Seed needs books before creating reservations.');
  }

  const bookIdAt = (index: number): string => books[index % books.length]._id.toString();

  for (let index = 0; index < 10; index += 1) {
    const memberId = getRequiredMemberId(memberMap, STUDENT_MEMBERS[index].email);
    await createLoan({
      memberId,
      copy: nextCopy(),
      checkoutDate: addDays(DEMO_NOW, -index - 1),
      dueDate: addDays(DEMO_NOW, 5 + (index % 5)),
      status: LoanStatus.Active,
      renewCount: index % 3 === 0 ? 1 : 0,
      notes: index % 3 === 0 ? 'Đã gia hạn một lần trong seed demo.' : undefined,
    });
  }

  const overdueDays = [2, 4, 7, 9, 12, 15, 20, 25];
  for (let index = 0; index < overdueDays.length; index += 1) {
    const studentIndex = 10 + index;
    const memberId = getRequiredMemberId(memberMap, STUDENT_MEMBERS[studentIndex].email);
    const days = overdueDays[index];
    const loanId = await createLoan({
      memberId,
      copy: nextCopy(),
      checkoutDate: addDays(DEMO_NOW, -14 - days),
      dueDate: addDays(DEMO_NOW, -days),
      status: LoanStatus.Overdue,
      notes: 'Khoản mượn quá hạn dùng để demo cảnh báo và tiền phạt.',
    });
    await createFine({
      loanId,
      memberId,
      overdueDate: addDays(DEMO_NOW, -days),
      amount: days * 5000,
      status: FineStatus.Unpaid,
      note: `Quá hạn ${days} ngày.`,
    });
  }

  for (let index = 0; index < 6; index += 1) {
    const studentIndex = 18 + index;
    const memberId = getRequiredMemberId(memberMap, STUDENT_MEMBERS[studentIndex].email);
    const returnedLate = index >= 4;
    const loanId = await createLoan({
      memberId,
      copy: nextCopy(),
      checkoutDate: addDays(DEMO_NOW, -28 - index),
      dueDate: addDays(DEMO_NOW, -14 - index),
      returnDate: returnedLate ? addDays(DEMO_NOW, -10 - index) : addDays(DEMO_NOW, -16 - index),
      status: LoanStatus.Returned,
      notes: returnedLate ? 'Đã trả trễ, phát sinh khoản phạt đã xử lý.' : 'Trả sách đúng hạn.',
    });

    if (returnedLate) {
      await createFine({
        loanId,
        memberId,
        overdueDate: addDays(DEMO_NOW, -14 - index),
        amount: index === 4 ? 20000 : 30000,
        status: index === 4 ? FineStatus.Paid : FineStatus.Waived,
        paidAt: index === 4 ? addDays(DEMO_NOW, -7) : undefined,
        waivedBy: index === 5 ? librarianId : undefined,
        note: index === 4 ? 'Đã thanh toán tiền phạt trả trễ.' : 'Miễn giảm theo quy định demo.',
      });
    }
  }

  for (let index = 0; index < 4; index += 1) {
    const studentIndex = 24 + index;
    const memberId = getRequiredMemberId(memberMap, STUDENT_MEMBERS[studentIndex].email);
    const loanId = await createLoan({
      memberId,
      copy: nextCopy(),
      checkoutDate: addDays(DEMO_NOW, -35 - index),
      dueDate: addDays(DEMO_NOW, -20 - index),
      status: LoanStatus.Lost,
      notes: 'Báo mất sách, dùng để demo nghiệp vụ phạt và khóa tài khoản.',
    });
    await createFine({
      loanId,
      memberId,
      overdueDate: addDays(DEMO_NOW, -18 - index),
      amount: index === 0 ? 60000 : 120000,
      status: index === 0 ? FineStatus.Paid : FineStatus.Unpaid,
      paidAt: index === 0 ? addDays(DEMO_NOW, -12) : undefined,
      note: index === 0 ? 'Đã thanh toán phí xử lý sách mất.' : 'Chưa thanh toán phí sách mất.',
    });
  }

  for (let index = 0; index < 18; index += 1) {
    const memberId = getRequiredMemberId(memberMap, STUDENT_MEMBERS[index % STUDENT_MEMBERS.length].email);
    await createLoan({
      memberId,
      copy: nextCopy(),
      checkoutDate: addDays(DEMO_NOW, -7 + (index % 7)),
      dueDate: addDays(DEMO_NOW, 8 + (index % 5)),
      returnDate: addDays(DEMO_NOW, -6 + (index % 7)),
      status: LoanStatus.Returned,
      notes: 'Lịch sử mượn/trả dùng cho biểu đồ tổng quan.',
    });
  }

  const reservedCopy = nextCopy();
  await BookCopyModel.findByIdAndUpdate(reservedCopy.copyId, { $set: { status: CopyStatus.Reserved } }).exec();

  await ReservationModel.insertMany([
    {
      memberId: getRequiredMemberId(memberMap, STUDENT_MEMBERS[28].email),
      bookId: bookIdAt(13),
      queuePosition: 1,
      status: ReservationStatus.Waiting,
      requestDate: addDays(DEMO_NOW, -3),
    },
    {
      memberId: getRequiredMemberId(memberMap, STUDENT_MEMBERS[29].email),
      bookId: bookIdAt(13),
      queuePosition: 2,
      status: ReservationStatus.Waiting,
      requestDate: addDays(DEMO_NOW, -2),
    },
    {
      memberId: getRequiredMemberId(memberMap, STUDENT_MEMBERS[0].email),
      bookId: reservedCopy.bookId,
      copyId: reservedCopy.copyId,
      queuePosition: 1,
      status: ReservationStatus.Notified,
      requestDate: addDays(DEMO_NOW, -6),
      notifiedAt: addDays(DEMO_NOW, -1),
      holdExpiryAt: addDays(DEMO_NOW, 2),
    },
    {
      memberId: getRequiredMemberId(memberMap, STUDENT_MEMBERS[18].email),
      bookId: bookIdAt(14),
      queuePosition: 1,
      status: ReservationStatus.Fulfilled,
      requestDate: addDays(DEMO_NOW, -20),
      notifiedAt: addDays(DEMO_NOW, -16),
    },
    {
      memberId: getRequiredMemberId(memberMap, STUDENT_MEMBERS[20].email),
      bookId: bookIdAt(15),
      queuePosition: 1,
      status: ReservationStatus.Cancelled,
      requestDate: addDays(DEMO_NOW, -10),
    },
    {
      memberId: getRequiredMemberId(memberMap, STUDENT_MEMBERS[22].email),
      bookId: bookIdAt(16),
      queuePosition: 1,
      status: ReservationStatus.Expired,
      requestDate: addDays(DEMO_NOW, -12),
      notifiedAt: addDays(DEMO_NOW, -8),
      holdExpiryAt: addDays(DEMO_NOW, -5),
    },
  ]);

  await MemberModel.updateMany(
    {
      email: {
        $in: [
          ...STUDENT_MEMBERS.slice(14, 18).map((student) => student.email),
          ...STUDENT_MEMBERS.slice(25, 28).map((student) => student.email),
        ],
      },
    },
    {
      $set: {
        isBlocked: true,
      },
    },
  ).exec();
}

async function runSeed(): Promise<void> {
  await connectToDatabase();
  await ensureIndexes();

  await seedLoanPolicies();
  await seedFineRate();
  const adminId = await seedAdminUser();
  const memberMap = await seedDemoMembers();

  const categoryMap = await seedCategories();
  const authorMap = await seedAuthors();
  await seedBooksAndCopies(categoryMap, authorMap);
  await resetDemoOperationalData();
  await seedOperationalScenarios(memberMap, adminId);

  const [
    bookCount,
    copyCount,
    memberCount,
    loanCount,
    reservationCount,
    fineCount,
    blockedMemberCount,
  ] = await Promise.all([
    BookModel.countDocuments(),
    BookCopyModel.countDocuments(),
    MemberModel.countDocuments(),
    LoanRecordModel.countDocuments(),
    ReservationModel.countDocuments(),
    FineRecordModel.countDocuments(),
    MemberModel.countDocuments({ isBlocked: true }),
  ]);

  logger.info(
    {
      bookCount,
      copyCount,
      memberCount,
      loanCount,
      reservationCount,
      fineCount,
      blockedMemberCount,
    },
    'Seed catalog and operations summary',
  );
}

void runSeed()
  .then(() => {
    logger.info('Seed completed successfully');
  })
  .catch((error: unknown) => {
    logger.error({ err: error }, 'Seed failed');
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDatabaseConnection();
    process.exit();
  });
