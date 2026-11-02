"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Loader2, Upload } from "lucide-react";
import { uploadPaymentSlipAction } from "@/actions/orders";
import { Alert, Button } from "@/components/ui";
import { compressImage, ImageError, SLIP_IMAGE_OPTIONS } from "@/lib/image-client";
import { formatBytes } from "@/lib/utils";

/**
 * Lets the customer pick a photo of their payment slip. The photo is shrunk in
 * the browser first (a 5 MB phone photo becomes a few hundred KB), shown as a
 * preview, and only then uploaded.
 */
export function SlipUploader({ orderId, hasSlip }: { orderId: string; hasSlip: boolean }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [originalSize, setOriginalSize] = useState(0);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  async function onPick(event: React.ChangeEvent<HTMLInputElement>) {
    const picked = event.target.files?.[0];
    setError(null);
    setFile(null);
    if (!picked) return;

    setPreparing(true);
    try {
      setOriginalSize(picked.size);
      setFile(await compressImage(picked, SLIP_IMAGE_OPTIONS));
    } catch (e) {
      setError(e instanceof ImageError ? e.message : "We could not read that image.");
      if (inputRef.current) inputRef.current.value = "";
    } finally {
      setPreparing(false);
    }
  }

  function upload() {
    if (!file) return;
    setError(null);
    const body = new FormData();
    body.set("orderId", orderId);
    body.set("file", file);

    startTransition(async () => {
      const result = await uploadPaymentSlipAction(body);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      {error ? <Alert>{error}</Alert> : null}

      <div>
        <label htmlFor="slip-file" className="mb-1.5 block text-sm font-medium">
          {hasSlip ? "Replace your payment slip" : "Upload your payment slip"}
        </label>
        <input
          ref={inputRef}
          id="slip-file"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={onPick}
          disabled={pending}
          className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-wash file:px-4 file:py-2 file:text-sm file:font-medium file:text-ink hover:file:bg-line"
        />
        <p className="mt-1.5 text-xs text-muted">A clear photo or screenshot (JPG, PNG or WebP). It is resized automatically.</p>
      </div>

      {preparing ? (
        <p className="flex items-center gap-2 text-sm text-muted">
          <Loader2 className="size-4 animate-spin" aria-hidden /> Preparing image…
        </p>
      ) : null}

      {file && preview ? (
        <div className="space-y-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Preview of your payment slip" className="max-h-72 w-auto rounded-lg ring-1 ring-line" />
          <p className="text-xs text-muted">
            Reduced from {formatBytes(originalSize)} to {formatBytes(file.size)}.
          </p>
          <Button onClick={upload} disabled={pending} className="w-full">
            {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Upload className="size-4" aria-hidden />}
            {pending ? "Uploading…" : "Send payment slip"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
