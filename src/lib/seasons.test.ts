import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getSeasonYearsFor, getCurrentSeasonId } from './seasons';
import type { SupabaseClient } from '@supabase/supabase-js';

describe('seasons', () => {
  describe('getSeasonYearsFor', () => {
    it('should return current year and next year for dates after August 1st', () => {
      const date = new Date(2024, 7, 15); // August 15, 2024
      const result = getSeasonYearsFor(date);
      
      expect(result).toEqual({ year_start: 2024, year_end: 2025 });
    });

    it('should return previous year and current year for dates before August 1st', () => {
      const date = new Date(2024, 6, 15); // July 15, 2024
      const result = getSeasonYearsFor(date);
      
      expect(result).toEqual({ year_start: 2023, year_end: 2024 });
    });

    it('should return current year and next year for August 1st', () => {
      const date = new Date(2024, 7, 1); // August 1, 2024
      const result = getSeasonYearsFor(date);
      
      expect(result).toEqual({ year_start: 2024, year_end: 2025 });
    });

    it('should return previous year and current year for July 31st', () => {
      const date = new Date(2024, 6, 31); // July 31, 2024
      const result = getSeasonYearsFor(date);
      
      expect(result).toEqual({ year_start: 2023, year_end: 2024 });
    });

    it('should handle year transition correctly', () => {
      // January 2024 -> season 2023-2024
      const janDate = new Date(2024, 0, 15);
      expect(getSeasonYearsFor(janDate)).toEqual({ year_start: 2023, year_end: 2024 });

      // December 2024 -> season 2024-2025
      const decDate = new Date(2024, 11, 15);
      expect(getSeasonYearsFor(decDate)).toEqual({ year_start: 2024, year_end: 2025 });
    });

    it('should handle edge cases at year boundaries', () => {
      // January 1, 2024 -> season 2023-2024
      const jan1 = new Date(2024, 0, 1);
      expect(getSeasonYearsFor(jan1)).toEqual({ year_start: 2023, year_end: 2024 });

      // August 1, 2024 -> season 2024-2025
      const aug1 = new Date(2024, 7, 1);
      expect(getSeasonYearsFor(aug1)).toEqual({ year_start: 2024, year_end: 2025 });
    });
  });

  describe('getCurrentSeasonId', () => {
    let mockSupabase: any;
    let mockFrom: any;

    beforeEach(() => {
      mockFrom = vi.fn();
      mockSupabase = {
        from: mockFrom,
      } as unknown as SupabaseClient;
    });

    it('should return season ID when season exists', async () => {
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq1 = vi.fn().mockReturnThis();
      const mockEq2 = vi.fn().mockReturnThis();
      const mockMaybeSingle = vi.fn().mockResolvedValue({
        data: { id: 'season-123' },
        error: null,
      });

      mockFrom.mockReturnValue({
        select: mockSelect,
        eq: mockEq1,
      });
      
      mockEq1.mockReturnValue({
        eq: mockEq2,
      });
      
      mockEq2.mockReturnValue({
        maybeSingle: mockMaybeSingle,
      });

      const now = new Date(2024, 7, 15); // August 15, 2024
      const result = await getCurrentSeasonId(mockSupabase, now);

      expect(result).toBe('season-123');
      expect(mockFrom).toHaveBeenCalledWith('seasons');
      expect(mockEq1).toHaveBeenCalledWith('year_start', 2024);
      expect(mockEq2).toHaveBeenCalledWith('year_end', 2025);
    });

    it('should throw error when season does not exist', async () => {
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq1 = vi.fn().mockReturnThis();
      const mockEq2 = vi.fn().mockReturnThis();
      const mockMaybeSingle = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      });

      mockFrom.mockReturnValue({
        select: mockSelect,
        eq: mockEq1,
      });
      
      mockEq1.mockReturnValue({
        eq: mockEq2,
      });
      
      mockEq2.mockReturnValue({
        maybeSingle: mockMaybeSingle,
      });

      const now = new Date(2024, 7, 15);
      
      await expect(getCurrentSeasonId(mockSupabase, now)).rejects.toThrow(
        'No existe temporada 2024-2025'
      );
    });

    it('should throw error when database query fails', async () => {
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq1 = vi.fn().mockReturnThis();
      const mockEq2 = vi.fn().mockReturnThis();
      const mockMaybeSingle = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database error', code: 'PGRST301' },
      });

      mockFrom.mockReturnValue({
        select: mockSelect,
        eq: mockEq1,
      });
      
      mockEq1.mockReturnValue({
        eq: mockEq2,
      });
      
      mockEq2.mockReturnValue({
        maybeSingle: mockMaybeSingle,
      });

      const now = new Date(2024, 7, 15);
      
      await expect(getCurrentSeasonId(mockSupabase, now)).rejects.toEqual({
        message: 'Database error',
        code: 'PGRST301',
      });
    });

    it('should use current date when now parameter is not provided', async () => {
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq1 = vi.fn().mockReturnThis();
      const mockEq2 = vi.fn().mockReturnThis();
      const mockMaybeSingle = vi.fn().mockResolvedValue({
        data: { id: 'season-current' },
        error: null,
      });

      mockFrom.mockReturnValue({
        select: mockSelect,
        eq: mockEq1,
      });
      
      mockEq1.mockReturnValue({
        eq: mockEq2,
      });
      
      mockEq2.mockReturnValue({
        maybeSingle: mockMaybeSingle,
      });

      const result = await getCurrentSeasonId(mockSupabase);

      expect(result).toBe('season-current');
      // Verifica que se llamó con los años de la fecha actual
      const currentYears = getSeasonYearsFor(new Date());
      expect(mockEq1).toHaveBeenCalledWith('year_start', currentYears.year_start);
      expect(mockEq2).toHaveBeenCalledWith('year_end', currentYears.year_end);
    });
  });
});
