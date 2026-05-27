import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from './Input.js';

export interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  debounceMs?: number;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChange,
  placeholder,
  debounceMs = 300,
}) => {
  const { t } = useTranslation();
  const [localVal, setLocalVal] = useState(value);
  // Keep a stable ref to onChange so the debounce effect doesn't re-fire
  // every time the parent re-renders with a new inline arrow function.
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });

  useEffect(() => {
    setLocalVal(value);
  }, [value]);

  useEffect(() => {
    const handler = setTimeout(() => {
      onChangeRef.current(localVal);
    }, debounceMs);

    return () => clearTimeout(handler);
  }, [localVal, debounceMs]);

  return (
    <div className="relative w-full max-w-sm">
      <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-fg-tertiary">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>
      <Input
        value={localVal}
        onChange={(e) => setLocalVal(e.target.value)}
        placeholder={placeholder || t('common.search')}
        className="pl-10 pr-10"
      />
      {localVal ? (
        <button
          onClick={() => setLocalVal('')}
          className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-fg-tertiary hover:text-fg-secondary"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      ) : null}
    </div>
  );
};
