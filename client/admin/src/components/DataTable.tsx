import { Table } from 'antd';
import type { TableProps } from 'antd';

export function DataTable<RecordType extends object>(props: TableProps<RecordType>) {
  return (
    <Table<RecordType>
      size="middle"
      scroll={{ x: 960 }}
      pagination={
        props.pagination
          ? {
              showSizeChanger: true,
              ...props.pagination,
            }
          : false
      }
      {...props}
    />
  );
}
