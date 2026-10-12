import { YMD, ageOn } from "./dates";

export const MIN_RIDER_AGE = 13; // COPPA: under 13 cannot enable location sensing

export const isEligibleRider = (dob: YMD, today: Date = new Date()) => ageOn(dob, today) >= MIN_RIDER_AGE;

export const INELIGIBLE_TITLE = "Sorry, you're not eligible";
export const INELIGIBLE_BODY =
  "To protect your privacy, riders must be 13 or older to share their bus location. We haven't saved your birthday or any information. A parent or guardian can still follow your bus in Parent mode.";
