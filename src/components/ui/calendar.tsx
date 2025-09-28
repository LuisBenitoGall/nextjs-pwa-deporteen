'use client';

import * as React from 'react';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { cn } from '@/lib/utils';

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

export function Calendar({ className, showOutsideDays = true, ...props }: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn('p-3 text-slate-100', className)}
      classNames={{
        months: 'flex flex-col sm:flex-row sm:space-x-4 space-y-4 sm:space-y-0',
        month: 'space-y-4',
        caption: 'flex justify-center pt-1 relative items-center',
        caption_label: 'text-sm font-medium',
        nav: 'space-x-1 flex items-center',
        nav_button:
          'h-8 w-8 bg-transparent p-0 opacity-50 hover:opacity-100 rounded-md border border-slate-700 text-slate-200 transition',
        nav_button_previous: 'absolute left-1',
        nav_button_next: 'absolute right-1',
        table: 'w-full border-collapse space-y-1',
        head_row: 'flex',
        head_cell: 'text-slate-400 rounded-md w-9 py-1 text-xs font-normal',
        row: 'flex w-full mt-2',
        cell: cn(
          'relative h-9 w-9 text-center text-sm focus-within:relative focus-within:z-20',
          'data-[state=selected]:text-slate-50 data-[state=selected]:bg-emerald-500/80 data-[state=selected]:hover:bg-emerald-500/90',
          'data-[state=selected]:focus:bg-emerald-500/90 data-[outside-month]:text-slate-600 data-[disabled]:text-slate-600',
          'data-[disabled]:opacity-50',
        ),
        day: 'h-9 w-9 p-0 font-normal',
        day_today: 'border border-emerald-500 text-slate-100',
        day_outside: 'opacity-50',
        weeknumber: 'text-xs text-slate-400',
      }}
      {...props}
    />
  );
}
