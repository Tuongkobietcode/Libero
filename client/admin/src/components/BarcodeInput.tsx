import { Button, Input, Space, Typography } from 'antd';
import { useState } from 'react';

interface BarcodeInputProps {
  label: string;
  placeholder: string;
  buttonLabel?: string;
  disabled?: boolean;
  loading?: boolean;
  value?: string;
  onChange?: (value: string) => void;
  onSubmit: (value: string) => void;
}

export function BarcodeInput({
  label,
  placeholder,
  buttonLabel = 'Xác nhận',
  disabled,
  loading,
  value,
  onChange,
  onSubmit,
}: BarcodeInputProps) {
  const [internalValue, setInternalValue] = useState('');
  const currentValue = value ?? internalValue;

  const handleSubmit = () => {
    const normalized = currentValue.trim();

    if (!normalized || disabled || loading) {
      return;
    }

    onSubmit(normalized);
  };

  const handleChange = (nextValue: string) => {
    if (onChange) {
      onChange(nextValue);
      return;
    }

    setInternalValue(nextValue);
  };

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <Typography.Text strong>{label}</Typography.Text>
      <Input.Search
        allowClear
        enterButton={<Button type="primary">{buttonLabel}</Button>}
        placeholder={placeholder}
        value={currentValue}
        loading={loading}
        disabled={disabled}
        onChange={(event) => handleChange(event.target.value)}
        onSearch={handleSubmit}
      />
    </Space>
  );
}
