import { toast } from "react-toastify";

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
