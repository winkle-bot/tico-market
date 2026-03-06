export const DRIVER_DOCUMENTS_BUCKET = 'driver-documents';

function isPublicUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

export async function createSignedDriverDocumentUrl(
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
  storageKey: string | null | undefined,
  expiresInSeconds = 60 * 30
): Promise<string | undefined> {
  if (!storageKey) {
    return undefined;
  }

  if (isPublicUrl(storageKey)) {
    return storageKey;
  }

  const { data, error } = await supabase.storage
    .from(DRIVER_DOCUMENTS_BUCKET)
    .createSignedUrl(storageKey, expiresInSeconds);

  if (error) {
    return undefined;
  }

  return data?.signedUrl;
}
