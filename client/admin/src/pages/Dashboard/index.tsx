import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  BookOutlined,
  CheckCircleOutlined,
  DollarCircleOutlined,
  FileTextOutlined,
  ReadOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import { AdminSelect } from '../../components/AdminSurface';
import { BookCoverArt } from '../../components/BookCoverArt';
import { catalogApi } from '../../services/catalog.api';
import { fineApi } from '../../services/fine.api';
import { loanApi } from '../../services/loan.api';
import { memberApi } from '../../services/member.api';
import { reportApi } from '../../services/report.api';
import { FineStatus, LoanStatus, Role, type LoanStatsItem } from '../../types/models';
import { formatCurrency, formatDate } from '../../utils/format';

interface StatConfig {
  title: string;
  value: string;
  hint: string;
  trend?: string;
  trendDirection?: 'up' | 'down';
  icon: ReactNode;
  tone: 'blue' | 'green' | 'orange' | 'red';
  loading: boolean;
}

interface ActivityItem {
  id: string;
  tone: 'blue' | 'green' | 'orange' | 'red';
  text: string;
  time: string;
}

function formatNumber(value?: number): string {
  return new Intl.NumberFormat('vi-VN').format(value ?? 0);
}

function formatCompactCurrency(value?: number): string {
  return formatCurrency(value ?? 0).replace(/\s/g, ' ');
}

function getToneClasses(tone: StatConfig['tone']) {
  if (tone === 'green') {
    return 'from-emerald-400 to-emerald-600 shadow-emerald-500/25';
  }

  if (tone === 'orange') {
    return 'from-amber-400 to-orange-500 shadow-orange-500/25';
  }

  if (tone === 'red') {
    return 'from-red-400 to-red-600 shadow-red-500/25';
  }

  return 'from-indigo-400 to-blue-600 shadow-blue-500/25';
}

function getActivityTone(tone: ActivityItem['tone']): string {
  if (tone === 'green') {
    return 'bg-emerald-50 text-emerald-600';
  }

  if (tone === 'orange') {
    return 'bg-orange-50 text-orange-600';
  }

  if (tone === 'red') {
    return 'bg-red-50 text-red-600';
  }

  return 'bg-indigo-50 text-indigo-600';
}

function getInitials(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

function StatCard({ stat }: { stat: StatConfig }) {
  return (
    <article className="flex min-h-[150px] items-center gap-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
      <span className={`grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-gradient-to-br text-3xl text-white shadow-xl ${getToneClasses(stat.tone)}`}>
        {stat.icon}
      </span>
      <div className="min-w-0">
        <p className="m-0 text-sm font-bold text-slate-600">{stat.title}</p>
        <strong className="mt-2 block truncate text-[1.85rem] font-extrabold leading-tight text-[#071026]">
          {stat.loading ? '...' : stat.value}
        </strong>
        {stat.trend && stat.trendDirection ? (
          <p className="m-0 mt-4 flex items-center gap-1 text-sm font-semibold text-slate-500">
            <span className={stat.trendDirection === 'up' ? 'text-emerald-600' : 'text-red-600'}>
              {stat.trendDirection === 'up' ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
            </span>
            <span className={stat.trendDirection === 'up' ? 'text-emerald-600' : 'text-red-600'}>{stat.trend}</span>
            {stat.hint}
          </p>
        ) : (
          <p className="m-0 mt-4 text-sm font-semibold text-slate-500">{stat.hint}</p>
        )}
      </div>
    </article>
  );
}

function normalizeChartData(data: LoanStatsItem[]) {
  const values = data.slice(-7);

  const rawMax = Math.max(1, ...values.flatMap((item) => [item.totalLoans, item.returnedLoans]));
  const tickStep = rawMax <= 10 ? 1 : Math.ceil(rawMax / 5);
  const max = Math.max(5, Math.ceil(rawMax / tickStep) * tickStep);
  const yTicks = Array.from({ length: 6 }, (_, index) => max - index * (max / 5));
  const width = 680;
  const height = 260;
  const left = 46;
  const right = 18;
  const top = 18;
  const bottom = 34;
  const chartWidth = width - left - right;
  const chartHeight = height - top - bottom;
  const xStep = values.length > 1 ? chartWidth / (values.length - 1) : chartWidth;

  const point = (value: number, index: number) => {
    const x = left + index * xStep;
    const y = top + chartHeight - (value / max) * chartHeight;
    return `${x},${y}`;
  };

  return {
    width,
    height,
    labels: values.map((item) => item.period.slice(5) || item.period),
    borrowPoints: values.map((item, index) => point(item.totalLoans, index)).join(' '),
    returnPoints: values.map((item, index) => point(item.returnedLoans, index)).join(' '),
    yTicks,
    left,
    top,
    chartHeight,
    chartWidth,
  };
}

function BorrowChart({ data }: { data: LoanStatsItem[] }) {
  if (!data.length) {
    return (
      <div className="grid min-h-[260px] place-items-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-center">
        <div>
          <p className="m-0 text-sm font-extrabold text-slate-700">Chưa có dữ liệu mượn/trả</p>
          <p className="m-0 mt-1 text-sm text-slate-500">Dữ liệu sẽ xuất hiện sau khi thủ thư tạo và xử lý khoản mượn.</p>
        </div>
      </div>
    );
  }

  const chart = normalizeChartData(data);

  return (
    <div className="overflow-hidden">
      <svg className="h-auto w-full" viewBox={`0 0 ${chart.width} ${chart.height}`} role="img" aria-label="Thống kê mượn sách">
        {chart.yTicks.map((tick, index) => {
          const y = chart.top + (index / (chart.yTicks.length - 1)) * chart.chartHeight;
          return (
            <g key={tick}>
              <text x="0" y={y + 4} className="fill-slate-500 text-[12px]">
                {tick}
              </text>
              <line x1={chart.left} x2={chart.left + chart.chartWidth} y1={y} y2={y} stroke="#e5e7eb" strokeWidth="1" />
            </g>
          );
        })}
        <polyline points={chart.borrowPoints} fill="none" stroke="#5b45e8" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <polyline points={chart.returnPoints} fill="none" stroke="#5271ff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="7 8" />
        {chart.labels.map((label, index) => {
          const x = chart.left + index * (chart.chartWidth / Math.max(chart.labels.length - 1, 1));
          return (
            <text key={`${label}-${index}`} x={x} y={chart.height - 6} textAnchor="middle" className="fill-slate-500 text-[12px]">
              {label}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

function BookCover({ title, seed }: { title: string; seed: string }) {
  return <BookCoverArt title={title} seed={seed} size="xs" />;
}

export default function DashboardPage() {
  const booksQuery = useQuery({
    queryKey: ['dashboard', 'books-count'],
    queryFn: () => catalogApi.listBooks({ page: 1, limit: 1 }),
  });
  const studentsQuery = useQuery({
    queryKey: ['dashboard', 'students-count'],
    queryFn: () => memberApi.listMembers({ role: Role.Student, page: 1, limit: 4 }),
  });
  const lecturersQuery = useQuery({
    queryKey: ['dashboard', 'lecturers-count'],
    queryFn: () => memberApi.listMembers({ role: Role.Lecturer, page: 1, limit: 1 }),
  });
  const activeLoansQuery = useQuery({
    queryKey: ['dashboard', 'active-loans'],
    queryFn: () => loanApi.listLoans({ status: LoanStatus.Active, page: 1, limit: 1 }),
  });
  const recentLoansQuery = useQuery({
    queryKey: ['dashboard', 'recent-loans'],
    queryFn: () => loanApi.listLoans({ page: 1, limit: 5 }),
  });
  const loanSummaryQuery = useQuery({
    queryKey: ['dashboard', 'loan-summary'],
    queryFn: () => reportApi.getLoanSummary({ groupBy: 'day' }),
  });
  const popularBooksQuery = useQuery({
    queryKey: ['dashboard', 'popular-books'],
    queryFn: () => reportApi.getPopularBooks({ limit: 5 }),
  });
  const fineSummaryQuery = useQuery({
    queryKey: ['dashboard', 'fine-summary'],
    queryFn: () => reportApi.getFineSummary({}),
  });

  const loading = [
    booksQuery,
    studentsQuery,
    lecturersQuery,
    activeLoansQuery,
    loanSummaryQuery,
    popularBooksQuery,
    fineSummaryQuery,
  ].some((query) => query.isLoading);
  const error =
    booksQuery.error ??
    studentsQuery.error ??
    lecturersQuery.error ??
    activeLoansQuery.error ??
    loanSummaryQuery.error ??
    popularBooksQuery.error ??
    fineSummaryQuery.error;

  const totalBooks = booksQuery.data?.pagination.totalItems ?? 0;
  const totalReaders = (studentsQuery.data?.pagination.totalItems ?? 0) + (lecturersQuery.data?.pagination.totalItems ?? 0);
  const activeLoans = activeLoansQuery.data?.pagination.totalItems ?? 0;
  const unpaidTotal = fineSummaryQuery.data?.summary.find((item) => item.status === FineStatus.Unpaid)?.totalAmount ?? 0;
  const paidActivity = fineSummaryQuery.data?.memberDebts?.[0];

  const stats: StatConfig[] = [
    {
      title: 'Tổng sách',
      value: formatNumber(totalBooks),
      hint: 'Dữ liệu hiện tại từ API',
      icon: <ReadOutlined />,
      tone: 'blue',
      loading,
    },
    {
      title: 'Độc giả',
      value: formatNumber(totalReaders),
      hint: 'Student + lecturer từ API',
      icon: <TeamOutlined />,
      tone: 'green',
      loading,
    },
    {
      title: 'Đang mượn',
      value: formatNumber(activeLoans),
      hint: 'Khoản mượn ACTIVE từ API',
      icon: <FileTextOutlined />,
      tone: 'orange',
      loading,
    },
    {
      title: 'Tiền phạt chờ thu',
      value: formatCompactCurrency(unpaidTotal),
      hint: 'Tổng UNPAID từ API',
      icon: <DollarCircleOutlined />,
      tone: 'red',
      loading,
    },
  ];

  const popularBooks = popularBooksQuery.data?.length
    ? popularBooksQuery.data.map((item) => ({
        id: item.book._id,
        title: item.book.title,
        author: item.book.isbn,
        count: item.checkoutCount,
      }))
    : [];
  const maxPopularCount = Math.max(1, ...popularBooks.map((book) => book.count));
  const newReaders = studentsQuery.data?.items ?? [];
  const activities: ActivityItem[] = [
    ...(recentLoansQuery.data?.items.slice(0, 4).map((loan, index) => ({
      id: loan._id,
      tone: index % 2 === 0 ? 'blue' as const : 'green' as const,
      text: `${loan.member.fullName} mượn sách ${loan.book.title}`,
      time: formatDate(loan.checkoutDate),
    })) ?? []),
    ...(paidActivity
      ? [
          {
            id: `fine-${paidActivity.member._id}`,
            tone: 'green' as const,
            text: `${paidActivity.member.fullName} còn ${formatCompactCurrency(paidActivity.unpaidTotal)} tiền phạt`,
            time: `${paidActivity.fineCount} khoản`,
          },
        ]
      : []),
  ].slice(0, 5);

  return (
    <div className="space-y-5">
      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-700">
          Không thể tải một phần dữ liệu tổng quan: {(error as Error).message}
        </div>
      ) : null}

      <section className="grid gap-4 2xl:grid-cols-4 lg:grid-cols-2">
        {stats.map((stat) => (
          <StatCard stat={stat} key={stat.title} />
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.25fr_1fr]">
        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="m-0 text-lg font-extrabold">Thống kê mượn sách</h2>
            </div>
            <AdminSelect wrapperClassName="min-w-36">
              <option>7 ngày qua</option>
            </AdminSelect>
          </div>
          <div className="mb-2 flex items-center justify-center gap-8 text-sm font-semibold">
            <span className="inline-flex items-center gap-2"><span className="h-1 w-7 rounded-full bg-[#5b45e8]" />Số lượt mượn</span>
            <span className="inline-flex items-center gap-2"><span className="h-1 w-7 rounded-full border-t-2 border-dashed border-[#5271ff]" />Số lượt trả</span>
          </div>
          <BorrowChart data={loanSummaryQuery.data ?? []} />
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
          <div className="mb-5 flex items-center justify-between gap-4">
            <h2 className="m-0 text-lg font-extrabold">Sách mượn nhiều nhất</h2>
            <AdminSelect wrapperClassName="min-w-36">
              <option>30 ngày qua</option>
            </AdminSelect>
          </div>
          {popularBooks.length ? (
            <div className="space-y-4">
              {popularBooks.map((book) => (
                <div className="flex items-center gap-4" key={book.title}>
                  <BookCover title={book.title} seed={book.id} />
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="m-0 truncate text-sm font-extrabold text-slate-900">{book.title}</p>
                        <p className="m-0 truncate text-xs font-semibold text-slate-500">{book.author}</p>
                      </div>
                      <span className="shrink-0 text-sm font-extrabold">{book.count} lượt</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-[#6b46d9]" style={{ width: `${Math.max(8, (book.count / maxPopularCount) * 100)}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid min-h-[300px] place-items-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-center">
              <div>
                <p className="m-0 text-sm font-extrabold text-slate-700">Chưa có dữ liệu sách mượn nhiều</p>
                <p className="m-0 mt-1 text-sm text-slate-500">Danh sách này lấy từ báo cáo mượn sách thực tế.</p>
              </div>
            </div>
          )}
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.25fr_1fr]">
        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="m-0 text-lg font-extrabold">Hoạt động gần đây</h2>
            <button className="rounded-xl bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-600" type="button">Xem tất cả</button>
          </div>
          <div className="divide-y divide-slate-100">
            {activities.length ? (
              activities.map((activity) => (
                <div className="flex items-center justify-between gap-4 py-3" key={activity.id}>
                  <div className="flex min-w-0 items-center gap-4">
                    <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${getActivityTone(activity.tone)}`}>
                      {activity.tone === 'red' ? <DollarCircleOutlined /> : activity.tone === 'green' ? <CheckCircleOutlined /> : <BookOutlined />}
                    </span>
                    <p className="m-0 truncate text-sm font-semibold text-slate-700">{activity.text}</p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold text-slate-500">{activity.time}</span>
                </div>
              ))
            ) : (
              <p className="m-0 py-8 text-center text-sm font-semibold text-slate-500">Chưa có hoạt động lưu thông.</p>
            )}
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="m-0 text-lg font-extrabold">Độc giả mới</h2>
            <button className="rounded-xl bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-600" type="button">Xem tất cả</button>
          </div>
          <div className="space-y-4">
            {newReaders.length ? (
              newReaders.map((reader) => (
                <div className="flex items-center justify-between gap-4" key={reader._id}>
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-slate-200 text-sm font-extrabold text-slate-700">
                      {getInitials(reader.fullName)}
                    </span>
                    <div className="min-w-0">
                      <p className="m-0 truncate text-sm font-extrabold text-slate-900">{reader.fullName}</p>
                      <p className="m-0 truncate text-sm text-slate-500">{reader.email}</p>
                    </div>
                  </div>
                  <span className="shrink-0 text-sm font-semibold text-slate-500">{formatDate(reader.createdAt)}</span>
                </div>
              ))
            ) : (
              <p className="m-0 py-8 text-center text-sm font-semibold text-slate-500">Chưa có độc giả mới.</p>
            )}
          </div>
        </article>
      </section>
    </div>
  );
}
