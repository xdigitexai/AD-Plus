export interface CheckoutRequest{workspaceId:string;planId:string;successUrl:string;cancelUrl:string;customerEmail:string}
export interface CheckoutResult{providerReference:string;redirectUrl:string}
export interface BillingProvider{readonly name:string;createCheckout(input:CheckoutRequest):Promise<CheckoutResult>;verifyWebhook(payload:string,signature:string):Promise<boolean>;refund(providerReference:string,amount?:number):Promise<void>}
export class DisabledBillingProvider implements BillingProvider{readonly name="disabled";async createCheckout():Promise<CheckoutResult>{throw new Error("Aucune passerelle de paiement n’est configurée") }async verifyWebhook(){return false}async refund(){throw new Error("Aucune passerelle de paiement n’est configurée")}}
