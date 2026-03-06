export const MESSAGE_ATTACHMENTS_BUCKET = 'message-attachments';

export type MessageAttachment =
  | {
      type: 'image';
      storageKey: string;
      mimeType?: string;
      fileName?: string;
      signedUrl?: string;
    }
  | {
      type: 'location';
      lat: number;
      lng: number;
      label?: string;
    };

function isPublicUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

export async function createSignedMessageAttachmentUrl(
  supabase: {
    storage: {
      from: (bucket: string) => {
        createSignedUrl: (
          path: string,
          expiresIn: number
        ) => Promise<{ data: { signedUrl?: string } | null; error: { message: string } | null }>;
      };
    };
  },
  storageKey: string,
  expiresInSeconds = 60 * 30
) {
  if (!storageKey) {
    return undefined;
  }

  if (isPublicUrl(storageKey)) {
    return storageKey;
  }

  const { data, error } = await supabase.storage
    .from(MESSAGE_ATTACHMENTS_BUCKET)
    .createSignedUrl(storageKey, expiresInSeconds);

  if (error) {
    return undefined;
  }

  return data?.signedUrl;
}
