"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Camera,
  CheckCircle2,
  LoaderCircle,
  Send,
  Upload,
  ClipboardList,
} from "lucide-react";
import { type ChangeEvent, type FormEvent, useEffect, useRef, useState } from "react";

import { createRequesterTicketAction } from "@/app/inbox/actions";
import {
  genericServiceRequestTemplate,
  getServiceRequestTemplate,
  type ServiceRequestField,
} from "@/features/service-requests/template-registry";
import { getServiceInboxProfile } from "@/features/service-inbox/profile-registry";
import { compressWorkPhoto, formatPhotoSize } from "@/lib/work-photo";
import { Card } from "@/components/ui";

type TargetDivision = {
  id: string;
  name: string;
  requestFormKey: string | null;
  inboxProfileKey: string;
};

export function ServiceRequestForm({
  targetDivision,
  categories,
  locations,
}: {
  targetDivision: TargetDivision;
  categories: string[];
  locations: string[];
}) {
  const router = useRouter();
  const template =
    getServiceRequestTemplate(targetDivision.requestFormKey) ??
    genericServiceRequestTemplate;
  const inboxProfile = getServiceInboxProfile(targetDivision.inboxProfileKey);
  const titleField = template.fields.find((field) => field.ticketField === "title");
  const customFields = template.fields.filter(
    (field) =>
      field.ticketField !== "title" &&
      (field.type !== "photo" || inboxProfile.features.requesterPhoto),
  );
  const hasSupportingPhoto = customFields.some((field) => field.type === "photo");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [compressingPhoto, setCompressingPhoto] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (photoPreview.startsWith("blob:")) URL.revokeObjectURL(photoPreview);
    };
  }, [photoPreview]);

  async function selectRequesterPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setCompressingPhoto(true);
    setError(null);
    try {
      const compressed = await compressWorkPhoto(file);
      setPhotoFile(compressed);
      setPhotoPreview(URL.createObjectURL(compressed));
    } catch (photoError) {
      setError(
        photoError instanceof Error ? photoError.message : "The photo could not be processed.",
      );
    } finally {
      setCompressingPhoto(false);
    }
  }

  function removeRequesterPhoto() {
    setPhotoFile(null);
    setPhotoPreview("");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || compressingPhoto) return;
    const data = new FormData(event.currentTarget);
    data.set("serviceDivisionId", targetDivision.id);

    const photoField = customFields.find((field) => field.type === "photo");
    if (photoFile) {
      data.set(photoField?.key ?? "requesterPhoto", photoFile);
      data.set("requesterPhoto", photoFile);
    }

    setSaving(true);
    setError(null);
    try {
      const result = await createRequesterTicketAction(data);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.replace("/requests");
      router.refresh();
    } catch {
      setError("The request could not be confirmed. Check your request history before trying again.");
    } finally {
      setSaving(false);
    }
  }

  function renderField(field: ServiceRequestField) {
    const requiredMark = field.required ? <span className="text-rose-500"> *</span> : null;
    const helpText = field.helpText ? (
      <p className="mt-1 text-[10px] text-slate-400">{field.helpText}</p>
    ) : null;

    switch (field.type) {
      case "text":
        return (
          <label key={field.key} className="block text-[11px] font-semibold text-slate-600">
            {field.label}{requiredMark}
            <input name={field.key} required={field.required} maxLength={field.maxLength ?? 200} placeholder={field.placeholder} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-xs outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
            {helpText}
          </label>
        );
      case "number":
        return (
          <label key={field.key} className="block text-[11px] font-semibold text-slate-600">
            {field.label}{requiredMark}
            <input type="number" name={field.key} required={field.required} min="1" placeholder={field.placeholder} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-xs outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
            {helpText}
          </label>
        );
      case "date":
        return (
          <label key={field.key} className="block text-[11px] font-semibold text-slate-600">
            {field.label}{requiredMark}
            <input type="date" name={field.key} required={field.required} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
            {helpText}
          </label>
        );
      case "select":
        return (
          <label key={field.key} className="block text-[11px] font-semibold text-slate-600">
            {field.label}{requiredMark}
            <select name={field.key} required={field.required} defaultValue={field.options?.[0] ?? ""} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500">
              {field.options?.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
            {helpText}
          </label>
        );
      case "master-category":
        return (
          <label key={field.key} className="block text-[11px] font-semibold text-slate-600">
            {field.label}{requiredMark}
            <select name={field.key} required={field.required} defaultValue={categories[0] ?? ""} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500">
              {categories.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>
        );
      case "textarea":
        return (
          <label key={field.key} className="block text-[11px] font-semibold text-slate-600">
            {field.label}{requiredMark}
            <textarea name={field.key} required={field.required} maxLength={field.maxLength ?? 10_000} rows={6} placeholder={field.placeholder} className="mt-1.5 min-h-36 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs leading-5 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
            {helpText}
          </label>
        );
      case "photo":
        return (
          <section key={field.key} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4" aria-labelledby={`photo-title-${field.key}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id={`photo-title-${field.key}`} className="text-[11px] font-semibold text-slate-700">{field.label} <span className="font-normal text-slate-400">{field.required ? "(required)" : "(optional)"}</span></h2>
                <p className="mt-1 text-[10px] leading-4 text-slate-500">{field.helpText ?? "The photo will be compressed to a JPEG file under 2 MB."}</p>
              </div>
              {photoPreview ? <button type="button" onClick={removeRequesterPhoto} disabled={compressingPhoto} className="shrink-0 rounded-lg bg-rose-50 px-2.5 py-1.5 text-[10px] font-semibold text-rose-600 disabled:opacity-50">Remove</button> : null}
            </div>
            {photoPreview ? <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white p-2"><Image src={photoPreview} width={720} height={540} unoptimized alt="Supporting photo preview" className="h-56 w-full rounded-lg object-contain" /><div className="mt-2 flex items-center justify-between gap-2 px-1"><span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-emerald-600"><CheckCircle2 size={13} /> Ready to submit</span><span className="text-[10px] text-slate-400">{photoFile ? formatPhotoSize(photoFile.size) : "Photo saved"}</span></div></div> : null}
            <div className={`grid grid-cols-[minmax(0,1fr)_3rem] gap-2 ${photoPreview ? "mt-2" : "mt-3"}`}>
              <button type="button" onClick={() => cameraInputRef.current?.click()} disabled={compressingPhoto} className={`flex w-full items-center justify-center rounded-xl border border-blue-300 bg-white px-4 text-center font-semibold text-blue-700 disabled:cursor-wait disabled:text-slate-400 ${photoPreview ? "h-10 gap-2 text-[10px]" : "min-h-24 flex-col text-[11px]"}`}>{compressingPhoto ? <LoaderCircle size={photoPreview ? 14 : 22} className="animate-spin" /> : <Camera size={photoPreview ? 14 : 22} />}<span className={photoPreview ? "" : "mt-2"}>{compressingPhoto ? "Processing photo..." : photoPreview ? "Take a new photo" : "Take a photo"}</span></button>
              <button type="button" onClick={() => galleryInputRef.current?.click()} disabled={compressingPhoto} className={`grid w-12 place-items-center rounded-xl border border-slate-200 bg-white text-indigo-600 disabled:cursor-wait disabled:text-slate-300 ${photoPreview ? "h-10" : "min-h-24"}`} aria-label="Choose a photo from the gallery" title="Choose from gallery"><Upload size={photoPreview ? 16 : 22} /></button>
            </div>
            <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={(event) => void selectRequesterPhoto(event)} className="sr-only" />
            <input ref={galleryInputRef} type="file" accept="image/*" onChange={(event) => void selectRequesterPhoto(event)} className="sr-only" />
          </section>
        );
      default:
        return null;
    }
  }

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50/60 px-4 py-4 sm:px-6"><span className="grid size-9 place-items-center rounded-xl bg-emerald-100 text-emerald-800"><ClipboardList size={18} /></span><div><h2 className="text-sm font-bold text-slate-900">Request details</h2><p className="mt-0.5 text-[11px] text-slate-500">Fields marked <span className="text-rose-500">*</span> are required.</p></div></div>
      <form onSubmit={submit} aria-busy={saving} className="w-full space-y-5 p-4 sm:p-6">
        <fieldset disabled={saving} className="min-w-0 disabled:opacity-70">
        <legend className="sr-only">GA request information</legend>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {titleField ? (
            <div>{renderField(titleField)}</div>
          ) : null}
          <label className="block text-[11px] font-semibold text-slate-600">
            Location <span className="text-rose-500">*</span>
            <select name="location" required defaultValue="" className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500">
              <option value="" disabled>Select your location</option>
              {locations.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>
          {customFields.map((field) => (
            <div
              key={field.key}
              className={
                field.type === "textarea" && !hasSupportingPhoto
                  ? "col-span-full"
                  : ""
              }
            >
              {renderField(field)}
            </div>
          ))}
        </div>
        </fieldset>
        {error ? <p role="alert" className="rounded-xl bg-rose-50 px-3.5 py-2.5 text-xs font-semibold text-rose-700">{error}</p> : null}
        <div className="flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[11px] text-slate-500">Track updates in your request history after submission.</p>
          <div className="flex items-center gap-2">
            {!saving ? <Link href="/requests" className="inline-flex min-h-11 items-center justify-center rounded-xl px-4 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-emerald-600">Cancel</Link> : null}
            <button type="submit" disabled={saving || compressingPhoto} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-800 px-5 py-3 text-xs font-semibold text-white shadow-md shadow-emerald-900/10 transition hover:bg-emerald-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 disabled:cursor-not-allowed disabled:opacity-60">{saving ? <LoaderCircle size={15} className="animate-spin motion-reduce:animate-none" /> : <Send size={15} />} {saving ? "Submitting request..." : compressingPhoto ? "Processing photo..." : "Submit to GA"}</button>
          </div>
        </div>
      </form>
    </Card>
  );
}
