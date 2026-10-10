import * as Crypto from "expo-crypto";

// Fresh random 128-bit token per trip, generated on the device. No user id involved.
export function newTripToken(): string {
  return Crypto.randomUUID();
}

export function canEnableSensing(birthYear: number, now = new Date()): boolean {
  return now.getFullYear() - birthYear >= 13; // COPPA: under 13 -> parent mode only
}
