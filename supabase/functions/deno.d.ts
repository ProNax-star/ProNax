// Type declarations for Deno globals
declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

// Type declarations for Deno URL imports
declare module "https://deno.land/std@0.168.0/http/server.ts" {
  export function serve(handler: (req: Request) => Promise<Response>): void;
}

declare module "https://esm.sh/@aws-sdk/client-s3@3.450.0" {
  export class S3Client {
    constructor(config: any);
    send(command: any): Promise<any>;
  }
  export class DeleteObjectCommand {
    constructor(input: any);
  }
  export class PutObjectCommand {
    constructor(input: any);
  }
  export class GetObjectCommand {
    constructor(input: any);
  }
}

declare module "https://esm.sh/@aws-sdk/s3-request-presigner@3.450.0" {
  export function getSignedUrl(client: any, command: any, options: any): Promise<string>;
}

declare module "https://esm.sh/@supabase/supabase-js@2.39.0" {
  export function createClient(url: string, key: string): any;
}
