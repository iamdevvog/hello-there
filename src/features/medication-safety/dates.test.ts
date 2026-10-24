import {expect,it} from "vitest";
import {dateValue,therapyDate} from "./model";
it("preserves valid future therapy dates but rejects impossible dates",()=>{expect(therapyDate.safeParse("2099-03-20").success).toBe(true);expect(therapyDate.safeParse("2026-02-30").success).toBe(false);expect(dateValue.safeParse("2099-03-20").success).toBe(false);});