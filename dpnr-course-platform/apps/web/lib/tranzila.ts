import {
  TranzilaTransactionRequest,
  TranzilaTransactionResponse,
  TranzilaTransactionRequestSchema,
  TranzilaTransactionResponseSchema,
  PaymentSession,
  PaymentVerification,
  TRANZILA_RESPONSE_CODES
} from '../types/payment';

export class TranzilaClient {
  private terminalId: string;
  private apiUrl: string;
  private responseUrl: string;
  private currency: string;
  private language: string;
  private testMode: boolean;

  constructor() {
    this.terminalId = process.env.TRANZILA_TERMINAL_ID!;
    this.apiUrl = process.env.TRANZILA_API_URL!;
    this.responseUrl = process.env.TRANZILA_RESPONSE_URL!;
    this.currency = process.env.TRANZILA_CURRENCY || 'ILS';
    this.language = process.env.TRANZILA_LANGUAGE || 'he';
    this.testMode = process.env.TRANZILA_TEST_MODE === 'true';

    if (!this.terminalId || !this.apiUrl) {
      throw new Error('Tranzila configuration missing: TRANZILA_TERMINAL_ID and TRANZILA_API_URL are required');
    }
  }

  /**
   * Create a payment session and get redirect URL for Tranzila payment page
   */
  async createPaymentSession(params: {
    orderId: string;
    amount: number;
    customerName?: string;
    customerEmail?: string;
    customerPhone?: string;
    description?: string;
  }): Promise<PaymentSession> {
    const request: TranzilaTransactionRequest = {
      sum: params.amount,
      currency: this.currency,
      cred_type: '1', // Credit card
      supplier: this.terminalId,
      tranmode: 'A', // Authorization + Capture
      lang: this.language,
      myid: params.orderId,
      contact: params.customerName,
      email: params.customerEmail,
      phone: params.customerPhone,
      description: params.description,
      response_return_method: 'POST',
      response_return_url: this.responseUrl,
      notify_url: this.responseUrl,
    };

    // Validate the request
    const validatedRequest = TranzilaTransactionRequestSchema.parse(request);

    // Create form data for Tranzila
    const formData = new URLSearchParams();
    Object.entries(validatedRequest).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, value.toString());
      }
    });

    // In test mode, use test terminal
    if (this.testMode) {
      formData.set('supplier', 'tterminal'); // Tranzila test terminal
    }

    // Tranzila works with form redirect, so we need to generate a redirect URL
    const redirectUrl = `${this.apiUrl}?${formData.toString()}`;

    return {
      orderId: params.orderId,
      amount: params.amount,
      currency: this.currency,
      redirectUrl,
    };
  }

  /**
   * Verify a transaction response from Tranzila
   */
  async verifyTransaction(response: Record<string, string>): Promise<PaymentVerification> {
    try {
      // Parse and validate the response
      const parsedResponse = TranzilaTransactionResponseSchema.parse(response);

      const isSuccess = parsedResponse.Response === '000';
      const responseText = TRANZILA_RESPONSE_CODES[parsedResponse.Response as keyof typeof TRANZILA_RESPONSE_CODES]
        || parsedResponse.ResponseText
        || 'Unknown response';

      if (isSuccess) {
        return {
          success: true,
          transactionId: parsedResponse.TransactionID,
          orderId: parsedResponse.myid,
          amount: parsedResponse.sum ? parseFloat(parsedResponse.sum) : undefined,
        };
      } else {
        return {
          success: false,
          orderId: parsedResponse.myid,
          error: `${parsedResponse.Response}: ${responseText}`,
        };
      }
    } catch (error) {
      console.error('Error verifying Tranzila transaction:', error);
      return {
        success: false,
        error: 'Invalid transaction response format',
      };
    }
  }

  /**
   * Query transaction status by transaction ID (for verification)
   */
  async queryTransaction(transactionId: string): Promise<PaymentVerification> {
    try {
      const queryParams = new URLSearchParams({
        supplier: this.testMode ? 'tterminal' : this.terminalId,
        tranmode: 'V', // Verify transaction
        index: transactionId,
      });

      const response = await fetch(`${this.apiUrl}?${queryParams.toString()}`, {
        method: 'GET',
        headers: {
          'User-Agent': 'DPNR-Course-Platform/1.0',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const responseText = await response.text();

      // Parse Tranzila's response format (usually key=value pairs)
      const responseData: Record<string, string> = {};
      responseText.split('&').forEach(pair => {
        const [key, value] = pair.split('=');
        if (key && value) {
          responseData[key] = decodeURIComponent(value);
        }
      });

      return this.verifyTransaction(responseData);
    } catch (error) {
      console.error('Error querying Tranzila transaction:', error);
      return {
        success: false,
        error: 'Failed to query transaction status',
      };
    }
  }

  /**
   * Format amount for Tranzila (in agorot for ILS)
   */
  static formatAmount(amount: number, currency: string = 'ILS'): number {
    if (currency === 'ILS') {
      // Convert to agorot (multiply by 100)
      return Math.round(amount * 100);
    }
    return amount;
  }

  /**
   * Parse amount from Tranzila response (from agorot to ILS)
   */
  static parseAmount(amount: string | number, currency: string = 'ILS'): number {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;

    if (currency === 'ILS') {
      // Convert from agorot (divide by 100)
      return numAmount / 100;
    }
    return numAmount;
  }
}