'use client';

import React from 'react';

export function SessionTableSkeleton() {
  return (
    <div className="w-full flex flex-col gap-4 p-6 animate-pulse">
      {/* Table header row placeholder */}
      <div className="flex justify-between border-b border-[#1e293b] pb-3 mb-2">
        <div className="h-4 bg-[#1e293b] rounded w-1/4" />
        <div className="h-4 bg-[#1e293b] rounded w-12" />
        <div className="h-4 bg-[#1e293b] rounded w-1/3" />
        <div className="h-4 bg-[#1e293b] rounded w-20" />
        <div className="h-4 bg-[#1e293b] rounded w-20" />
        <div className="h-4 bg-[#1e293b] rounded w-16" />
        <div className="h-4 bg-[#1e293b] rounded w-16" />
      </div>

      {/* 10 placeholder rows */}
      {Array.from({ length: 10 }).map((_, idx) => (
        <div key={idx} className="flex items-center justify-between border-b border-[#1e293b]/40 py-3.5">
          <div className="h-4 bg-[#1a2234] rounded w-1/4" />
          <div className="h-3 bg-[#1a2234] rounded w-12 font-mono" />
          <div className="h-3 bg-[#1a2234] rounded w-1/3" />
          <div className="h-5 bg-[#1a2234] rounded-full w-20" />
          <div className="h-5 bg-[#1a2234] rounded-full w-20" />
          <div className="h-3 bg-[#1a2234] rounded w-16 font-mono" />
          <div className="h-8 bg-[#1a2234] rounded-lg w-24" />
        </div>
      ))}
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-8 w-full animate-pulse p-1 sm:p-2">
      {/* Header section placeholder */}
      <div className="flex flex-col md:flex-row justify-between pb-5 border-b border-[#1e293b] gap-4">
        <div className="flex flex-col gap-2">
          <div className="h-7 bg-[#1e293b] rounded w-64" />
          <div className="h-4 bg-[#1e293b] rounded w-96" />
        </div>
        <div className="h-10 bg-[#1e293b] rounded-xl w-48" />
      </div>

      {/* 6 stats cards placeholders (request asked for 6 stat card placeholders, 2 chart boxes) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6 w-full">
        {Array.from({ length: 6 }).map((_, idx) => (
          <div key={idx} className="p-5 rounded-2xl bg-[#111827] border border-[#1e293b] flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <div className="h-3.5 bg-[#1a2234] rounded w-20" />
              <div className="h-5 w-5 bg-[#1a2234] rounded-lg" />
            </div>
            <div className="h-8 bg-[#1a2234] rounded w-16 mt-1" />
            <div className="h-3 bg-[#1a2234] rounded w-28 mt-0.5" />
          </div>
        ))}
      </div>

      {/* 2 chart boxes placeholders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full">
        <div className="p-6 rounded-2xl bg-[#111827] border border-[#1e293b] h-[350px] flex flex-col gap-4">
          <div className="h-5 bg-[#1a2234] rounded w-48" />
          <div className="flex-1 bg-[#1a2234]/30 rounded-xl" />
        </div>
        <div className="p-6 rounded-2xl bg-[#111827] border border-[#1e293b] h-[350px] flex flex-col gap-4">
          <div className="h-5 bg-[#1a2234] rounded w-48" />
          <div className="flex-1 bg-[#1a2234]/30 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

export function ReportSkeleton() {
  return (
    <div className="flex flex-col gap-6 w-full animate-pulse">
      {/* Header placeholder */}
      <div className="p-6 rounded-2xl bg-[#111827] border border-[#1e293b] flex flex-col gap-3">
        <div className="h-3 bg-[#1e293b] rounded w-24" />
        <div className="h-7 bg-[#1e293b] rounded w-1/2" />
        <div className="h-3 bg-[#1e293b] rounded w-32" />
      </div>

      {/* Tab bar placeholder */}
      <div className="flex border-b border-[#1e293b] pb-2 gap-4">
        <div className="h-8 bg-[#1e293b] rounded w-32" />
        <div className="h-8 bg-[#1e293b] rounded w-32" />
        <div className="h-8 bg-[#1e293b] rounded w-32" />
        <div className="h-8 bg-[#1e293b] rounded w-32" />
      </div>

      {/* 3 section placeholder blocks matching report layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start w-full">
        {/* Left Column (8 cols): Executive summary & details */}
        <div className="lg:col-span-8 flex flex-col gap-8">
          {/* Block 1 */}
          <div className="p-6 rounded-2xl bg-[#111827] border border-[#1e293b] flex flex-col gap-4">
            <div className="h-4 bg-[#1e293b] rounded w-32" />
            <div className="h-6 bg-[#1e293b] rounded w-1/2" />
            <div className="h-3 bg-[#1e293b] rounded w-full" />
            <div className="h-3 bg-[#1e293b] rounded w-5/6" />
          </div>

          {/* Block 2 */}
          <div className="p-6 rounded-2xl bg-[#111827] border border-[#1e293b] flex flex-col gap-4">
            <div className="h-4 bg-[#1e293b] rounded w-40" />
            <div className="h-3 bg-[#1e293b] rounded w-full" />
            <div className="h-3 bg-[#1e293b] rounded w-full" />
            <div className="h-3 bg-[#1e293b] rounded w-3/4" />
          </div>
        </div>

        {/* Right Column (4 cols): Disposition & PDF tools */}
        <div className="lg:col-span-4 flex flex-col gap-8">
          {/* Block 3 */}
          <div className="p-6 rounded-2xl bg-[#111827] border border-[#1e293b] flex flex-col gap-4">
            <div className="h-4 bg-[#1e293b] rounded w-28" />
            <div className="h-3 bg-[#1e293b] rounded w-full" />
            <div className="h-3 bg-[#1e293b] rounded w-5/6" />
            <div className="h-10 bg-[#1e293b] rounded-xl w-full mt-2" />
          </div>
        </div>
      </div>
    </div>
  );
}
