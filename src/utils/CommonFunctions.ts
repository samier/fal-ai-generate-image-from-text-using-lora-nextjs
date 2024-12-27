import JSZip from "jszip";
import { toast } from "react-toastify";
import { saveAs } from "file-saver";

export const showToast = (
  message: string,
  type: "info" | "success" | "error" | "warning" = "success"
) => {
  const toastFunc = (() => {
    if (type == "error") {
      return toast.error;
    } else if (type == "info") {
      return toast.info;
    } else if (type == "warning") {
      return toast.warning;
    }
    return toast.success;
  })();

  toastFunc(message, {
    onClick: () => toast.dismiss(),
    position: "bottom-right",
  });
};

export const hideToast = () => toast.dismiss();

// Helpers
export const extractFileName = (url: string) => {
  const urlParts = url.split("/");
  return urlParts[urlParts.length - 1].split("?")[0];
};

export const downloadImageFiles = async (images: Array<{ url: string }>) => {
  try {
    toast.loading("Downloading...");
    if (images?.length === 1) {
      const { url } = images[0];
      const fileName = extractFileName(url);
      const response = await fetch(url);
      const blob = await response.blob();

      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      hideToast();
      showToast("Downloaded successfully");
    } else if (images.length > 1) {
      const zip = new JSZip();
      const download = async ({ url }: any) => {
        const fileName = extractFileName(url);
        const response = await fetch(url);
        const blob = await response.blob();
        zip.file(fileName, blob);
      };

      const fetchFiles = images.map(download);

      await Promise.all(fetchFiles);
      zip.generateAsync({ type: "blob" }).then((content: Blob) => {
        saveAs(content, "files.zip");
      });
      hideToast();
      showToast("Downloaded successfully");
    }
  } catch (error) {
    console.error("Error downloading files:", error);
  }
};
