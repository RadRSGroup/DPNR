import { z } from 'zod';

// Tranzila API Request/Response Types
export const TranzilaTransactionRequestSchema = z.object({
  // Required fields
  sum: z.number().positive(),
  currency: z.string().default('ILS'),
  cred_type: z.string().default('1'), // Credit card
  supplier: z.string(), // Terminal ID

  // Optional transaction fields
  tranmode: z.string().optional().default('A'), // Authorization + Capture
  lang: z.string().optional().default('he'), // Hebrew

  // Customer information
  contact: z.string().optional(), // Customer name
  email: z.string().email().optional(),
  phone: z.string().optional(),

  // Order information
  myid: z.string().optional(), // Our order ID
  description: z.string().optional(),

  // Response URLs
  response_return_method: z.string().optional().default('POST'),
  response_return_url: z.string().url().optional(),
  notify_url: z.string().url().optional(),
});

export const TranzilaTransactionResponseSchema = z.object({
  Response: z.string(), // "000" = success, other codes = error
  ResponseText: z.string(), // Human readable response
  TransactionID: z.string().optional(),
  sum: z.string().optional(),
  currency: z.string().optional(),
  ccno: z.string().optional(), // Masked card number
  expmonth: z.string().optional(),
  expyear: z.string().optional(),
  myid: z.string().optional(), // Our order ID
  index: z.string().optional(), // Tranzila internal ID
  ConfirmationCode: z.string().optional(),
  Responsesource: z.string().optional(),
  Responsecvv: z.string().optional(),
  Responseid: z.string().optional(),
  fpay: z.string().optional(),
  spay: z.string().optional(),
  npay: z.string().optional(),
});

export type TranzilaTransactionRequest = z.infer<typeof TranzilaTransactionRequestSchema>;
export type TranzilaTransactionResponse = z.infer<typeof TranzilaTransactionResponseSchema>;

// Internal payment types
export interface PaymentSession {
  orderId: string;
  amount: number;
  currency: string;
  redirectUrl: string;
}

export interface PaymentVerification {
  success: boolean;
  transactionId?: string;
  orderId?: string;
  amount?: number;
  error?: string;
}

// Tranzila response codes
export const TRANZILA_RESPONSE_CODES = {
  '000': 'Transaction approved',
  '001': 'Transaction declined',
  '002': 'Transaction declined (insufficient funds)',
  '003': 'Invalid merchant',
  '004': 'Invalid card',
  '005': 'Capture error',
  '006': 'General error',
  '033': 'Card expired',
  '034': 'Pickup card',
  '036': 'Restricted card',
  '041': 'Lost card',
  '043': 'Stolen card',
  '050': 'Invalid transaction',
  '051': 'Insufficient funds',
  '054': 'Card expired',
  '055': 'Invalid PIN',
  '057': 'Invalid transaction for cardholder',
  '058': 'Invalid transaction for terminal',
  '061': 'Exceeds withdrawal limit',
  '062': 'Restricted card',
  '065': 'Activity limit exceeded',
  '075': 'Allowable PIN tries exceeded',
  '076': 'Invalid/nonexistent account',
  '078': 'Account blocked',
  '079': 'Credit floor limit exceeded',
  '080': 'Credit limit exceeded',
  '082': 'Timeout',
  '083': 'PIN verification failed',
  '084': 'Invalid authorization life cycle',
  '091': 'Issuer or switch inoperative',
  '092': 'Financial institution or intermediate network facility cannot be found',
  '094': 'Duplicate transmission',
  '096': 'System malfunction',
} as const;

export type TranzilaResponseCode = keyof typeof TRANZILA_RESPONSE_CODES;