"use client";
import "dotenv/config";
import Button from "@/components/button/Button";
import axios from "axios";
import React from "react";
import { ClipLoader } from "react-spinners";
import { downloadImageFiles, extractFileName, hideToast, showToast } from "@/utils/CommonFunctions";
import styles from './MainPage.module.css';
import Select from "../../components/select/Select";
import { IMAGE_SIZE } from "@/constants/constants";
import { toast } from "react-toastify";
import JSZip from "jszip";
import { saveAs } from 'file-saver';

type OwnedWorksItem = {
    name: string;
    path: string;
    scale: number;
    owned_type: string;
    type: string;
    title: string;
};

type ImageType = {
    url: string;
    height: string;
    width: string;
};

export default function MainPage() {
    const [isLoading, setIsLoading] = React.useState(true);
    const textareaRef = React.useRef(null);
    const [textValue, setTextValue] = React.useState("");
    const [imageSize, setImageSize] = React.useState<string>("");
    const [negativePrompt, setNegativePrompt] = React.useState<string>("");
    const [lorasList, setLorasList] = React.useState<OwnedWorksItem[]>([]);
    const [images, setImages] = React.useState<ImageType[]>([]);
    const [selectedLoras, setSelectedLoras] = React.useState<any>([]);
    const [guardianScale, setGuardianScale] = React.useState<number>(1.2);
    const [noOfImages, setNoOfImages] = React.useState<number>(1);
    const [steps, setSteps] = React.useState<number>(28);
    const [imageLoading, setImageLoading] = React.useState<boolean>(false);

    // Mounting
    React.useEffect(() => {
        getLorasList();
    }, []);

    // API Requests
    const getLorasList = async () => {
        axios
            .get(`${process.env.NEXT_PUBLIC_API_URI}/loras-list`)
            ?.then((res: any) => {
                if (res?.data?.length > 0) {
                    setLorasList(res?.data);
                }
            })
            .catch((err: any) => {
                if (err?.response?.data?.error) {
                    showToast(err?.response?.data?.error, "error");
                }
            }).finally(() => {
                setIsLoading(false);
            });
    };

    const generateImage = async (payload: any) => {
        setImageLoading(true);
        await axios
            .post(`${process.env.NEXT_PUBLIC_API_URI}/generate-image`, payload)
            .then((res: any) => {
                if (res?.data?.data) {
                    const apiImages = res?.data?.data?.data?.images?.map((img: any) => {
                        return {
                            url: img?.url,
                            height: img?.height ? `${img?.height}px` : "auto",
                            width: img?.width ? `${img?.width}px` : "auto",
                        };
                    });
                    if (apiImages?.length > 0) {
                        setImages(apiImages);
                        showToast(apiImages?.length + ' Image Generated Successfully.');
                    }
                }
            })
            .catch((err: any) => {
                if (err?.status == 500) {
                    if (err?.response?.data?.error == "Forbidden") {
                        showToast(
                            "User is locked. Reason: Exhausted balance. Top up your balance at fal.ai/dashboard/billing.",
                            "error"
                        );
                    } else if (err?.response?.data?.error == "Unauthorized") {
                        showToast("Failed to generate image.", "error");
                    } else {
                        showToast(err?.response?.data?.message, "error");
                    }
                } else {
                    showToast("Network error", "error");
                }
            })
            .finally(() => {
                setImageLoading(false);
            });
    };

    // Events
    const handleLorasScale = (index: number, newScale: number) => {
        setSelectedLoras((prev: any) =>
            prev.map((item: any, i: any) =>
                i === index ? { ...item, scale: newScale } : item
            )
        );
    };

    const handleActionClick = (path: string, isSelected: boolean) => {
        const textarea: any = textareaRef.current;
        if (textarea) {
            const start = textarea.selectionStart + 1;
            const end = textarea.selectionEnd;
            const updatedText = isSelected
                ? textValue?.replaceAll(`FF-${path}`, "")?.trim()
                : textValue.slice(0, start) + `FF-${path}` + textValue.slice(end);
            setTextValue((updatedText + " ")?.trimStart());
            let prompt = updatedText.replaceAll("FF-", " ");
            if (prompt.charAt(0) === ",") {
                prompt = prompt.slice(1);
            }
            setSelectedLoras(filterWorks(prompt));
            setTimeout(() => {
                const newCursorPosition = start + `FF-${path}`.length;
                textarea.setSelectionRange(newCursorPosition, newCursorPosition);
                textarea.focus();
            }, 0);
        }
    };

    const handleChange = (name: any, scale: any) => {
        const updatedData = selectedLoras?.map((item: any) =>
            item.name === name ? { ...item, scale: Number(scale) } : item
        );
        setSelectedLoras(updatedData);
    };

    const onChangePrompt = (e: any) => {
        const text = e?.target?.value;
        const keywords = text.split(" ");
        const newArr = lorasList.filter((item: OwnedWorksItem) =>
            keywords.includes("FF-" + item?.name || "")
        );
        const works = newArr.map((item: any) => {
            return { path: item.path, scale: 1.27, name: item.name };
        });
        setSelectedLoras(works);
        setTextValue(e.target.value);
    };

    const handleDragStart = (
        e: React.DragEvent<HTMLDivElement>,
        ownedWorksName: string
    ) => {
        e.dataTransfer.setData("text/plain", ownedWorksName.toString());
    };

    const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
        e.dataTransfer.clearData();
    };

    const handleDrop: any = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        const ownedWorksName = e.dataTransfer.getData("text/plain");
        const text = ownedWorksName;
        const prompt = textValue.replaceAll("FF-", " ");
        setSelectedLoras(filterWorks(prompt + " " + text));
        setTextValue(textValue + "FF-" + ownedWorksName + " ");
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
    };

    // Utils
    const filterWorks = (text: string) => {
        const keywords = text.split(" ");
        const newArr = lorasList.filter((item: OwnedWorksItem) =>
            keywords.includes(item?.name || "")
        );
        const updatedRecs = newArr.map((item: any) => {
            const existingItem = selectedLoras.find((selectedItem: any) => selectedItem.name === item.name);
            return {
                path: item.path,
                scale: existingItem ? existingItem?.scale : 1.27,
                name: item.name
            };
        });
        return updatedRecs
    };


    const openImageInNewTab = (src: string) => {
        window.open(src, "_blank", "noopener,noreferrer");
    };

    // On Submit
    const onSubmit = () => {
        let prompt = textValue.replaceAll("FF-", " ");
        if (prompt?.trim() == "" || !prompt) {
            showToast("Please enter valid prompt!!", "error");
            return;
        }
        if (prompt.charAt(0) === ",") {
            prompt = prompt.slice(1);
        }
        const payload = {
            prompt: prompt?.trim(),
            ...(imageSize && { image_size: imageSize }),
            num_inference_steps: steps,
            guidance_scale: guardianScale,
            num_images: noOfImages,
            loras: selectedLoras,
            negative_prompt: negativePrompt,
        };

        generateImage(payload);
    };

    // Render Components
    const RenderSpan = ({ value }: { value: string | number }) => {
        return <span className={`text-black dark:text-black ${styles.span_value}`}>
            {value}
        </span>
    }
    const RenderLoras = () => {
        return lorasList?.map((res: OwnedWorksItem, index: number) => {
            const isSelected = selectedLoras?.some(
                (item: any) => item?.name == res?.name
            );
            const isOwnedWork = res?.owned_type == "Owned";
            return (
                isOwnedWork && (
                    <span
                        draggable
                        onDragStart={(e: any) => handleDragStart(e, res?.name)}
                        onDragEnd={handleDragEnd}
                        key={index}
                        onClick={() => handleActionClick(res?.name, isSelected)}
                        className={`${styles.lora} hover:bg-[#111419] ${!isSelected
                            ? "bg-[#38394f]"
                            : "bg-[#f2bcbc] hover:bg-[#ecadad]"
                            }`}
                    >
                        {res?.name}
                    </span>
                )
            );
        });
    }
    const RenderScaleInputs = () => {
        return selectedLoras?.length > 0 && (
            <div>
                <p className="text-lg text-white">Loras Scales</p>
                {selectedLoras?.map((item: any, index: number) => (
                    <div
                        className="flex-row flex justify-between py-1.5 pl-5"
                        key={index}
                    >
                        <label htmlFor="scale" className="text-white">
                            {item?.name} Scale
                        </label>
                        <div className="w-8/12 flex justify-center gap-2">
                            <input
                                type="range"
                                min={0.0}
                                max={4.0}
                                value={item?.scale}
                                id={item.name}
                                step={0.01}
                                className="w-11/12"
                                onChange={(e: any) =>
                                    handleLorasScale(index, Number(e.target.value))
                                }
                            />
                            <RenderSpan value={item?.scale} />
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#111419] flex flex-col gap-5 p-4 sm:text-base text-sm">
            <h1 className="text-white sm:text-2xl text-lg font-semibold">
                General Image
            </h1>
            <div className="flex lg:flex-row flex-col-reverse gap-4">
                <div className="lg:w-3/4 w-full flex-grow bg-[#2c2d44] rounded-md p-3">
                    <p className="text-white sm:text-xl text-base font-semibold">
                        Prompt
                    </p>
                    <div>
                        <div className="flex md:flex-row flex-col justify-between gap-3 mt-4 ">
                            <div className="rounded-md border bg-[#2e334d] flex-1 p-3">
                                <textarea
                                    onDrop={(e: any) => handleDrop(e)}
                                    onDragOver={(e: any) => handleDragOver(e)}
                                    ref={textareaRef}
                                    name="prompt"
                                    value={textValue}
                                    onChange={onChangePrompt}
                                    id="prompt"
                                    className="bg-transparent w-full resize-none text-white px-3 py-2 h-full focus:outline-none h-50"
                                    placeholder="Enter your imagination..."
                                ></textarea>
                            </div>
                            <div className="md:w-2/4 w-full min-h-44 rounded-md border bg-[#2e334d] p-5 flex flex-col justify-between gap-3 h-52 overflow-y-scroll">
                                <div className="lg:flex-row md:flex-col sm:flex-row flex-col flex justify-between">
                                    <label htmlFor="noOfImages" className="text-white">
                                        Number of images
                                    </label>
                                    <div className="lg:w-8/12 w-full flex justify-center items-center gap-2">
                                        <input
                                            type="range"
                                            min={1}
                                            max={4}
                                            value={noOfImages}
                                            id="noOfImages"
                                            step={1}
                                            className="lg:w-11/12 w-full"
                                            onChange={(e: any) =>
                                                setNoOfImages(Number(e.target.value || 1))
                                            }
                                        />
                                        <RenderSpan value={noOfImages} />
                                    </div>
                                </div>
                                <div className="lg:flex-row md:flex-col sm:flex-row flex-col sm:gap-2 gap-2 flex justify-between">
                                    <label htmlFor="imgSize" className="text-white">
                                        Image Size
                                    </label>
                                    <Select
                                        onChange={(e: any) => setImageSize(e.target?.value || "")}
                                        items={IMAGE_SIZE}
                                        name="imgSize"
                                        id="imgSize"
                                    />
                                </div>
                                <div className="lg:flex-row md:flex-col sm:flex-row flex-col flex justify-between">
                                    <label htmlFor="scale" className="text-white">
                                        Guidance Scale
                                    </label>
                                    <div className="lg:w-11/12 w-full flex justify-center items-center gap-2">
                                        <input
                                            type="range"
                                            min={0.0}
                                            max={4.0}
                                            value={guardianScale}
                                            id="scale"
                                            step={0.01}
                                            className="w-11/12"
                                            onChange={(e: any) => setGuardianScale(Number(e.target.value))}
                                        />

                                        <RenderSpan value={guardianScale} />
                                    </div>
                                </div>
                                <div>
                                    {/* <p className="sm:text-lg text-base text-white">
                                        Loras Scales
                                    </p>
                                    <RenderScales /> */}
                                </div>
                                <div className="lg:flex-row md:flex-col sm:flex-row flex-col flex lg:gap-4 gap-1 justify-between">
                                    <label htmlFor="steps" className="text-white">
                                        Steps
                                    </label>
                                    <div className="lg:w-11/12 w-full flex justify-center items-center gap-2">
                                        <input
                                            type="range"
                                            min={1}
                                            max={50}
                                            value={steps}
                                            id="steps"
                                            step={1}
                                            className="w-11/12"
                                            onChange={(e: any) => setSteps(Number(e.target.value))}
                                        />
                                        <RenderSpan value={steps} />
                                    </div>
                                </div>
                                <RenderScaleInputs />
                            </div>
                        </div>

                        <div className="flex md:flex-row flex-col justify-between gap-3 pt-4">
                            <div className="flex-1">
                                <h1 className="text-white font-semibold rounded-md py-2 sm:text-xl text-base">
                                    Negative Prompt
                                </h1>
                                <div className="h-40 rounded-md border bg-[#2e334d] flex-1 p-3">
                                    <textarea
                                        name="prompt"
                                        id="prompt"
                                        value={negativePrompt}
                                        onChange={(e: any) => setNegativePrompt(e?.target?.value)}
                                        className="bg-transparent w-full resize-none text-white px-3 py-2 focus:outline-none h-full"
                                        placeholder="Enter your negative prompt..."
                                    ></textarea>
                                </div>
                            </div>
                        </div>
                        <Button
                            onClick={onSubmit}
                            label="Generate Image"
                            isLoading={imageLoading}
                        />
                    </div>
                </div>
                <div className="lg:w-1/4 w-full lg:h-screen h-48  overflow-y-scroll flex-grow bg-[#2c2d44] rounded-md p-3 py-5">
                    {isLoading ? (
                        <div className="h-full w-full flex items-center justify-center">
                            <ClipLoader color="#fff" loading={isLoading} size={50} />
                        </div>
                    ) : (
                        <>
                            <h1 className="text-white sm:text-xl text-base font-semibold">
                                Trained LORA's
                            </h1>
                            <div className="flex gap-4 flex-wrap mt-3">
                                <RenderLoras />
                            </div>
                        </>
                    )}
                </div>
            </div>
            <div className="bg-transparent md:flex-row flex-col-reverse flex gap-3">
                <div className="bg-[#2c2d44] p-3 rounded-md w-full">
                    <p className="text-white sm:text-xl text-base font-semibold">
                        Generate Result
                    </p>
                    <div
                        className={`rounded-md border gap-5 overflow-x-auto p-3  flex items-start w-auto ${images?.length < 1 && "h-52"} ${imageLoading && "h-52"}`}>
                        {imageLoading ? (
                            <div className={styles.imgLoader}>
                                <ClipLoader color="#fff" loading={imageLoading} size={50} />
                            </div>
                        ) : (
                            images.map((img: ImageType, index: number) => (
                                <img
                                    key={index}
                                    title={img?.url}
                                    alt={"Unable to load image"}
                                    className="text-white"
                                    src={img?.url}
                                    height={"auto"}
                                    width={"auto"}
                                    style={{ maxWidth: "none" }}
                                    onClick={() => openImageInNewTab(img?.url)}
                                />
                            ))
                        )}
                    </div>
                    {images?.length > 0 && <Button
                        onClick={() => downloadImageFiles(images)}
                        label="Download"
                    />}
                </div>
            </div>
        </div>
    );
}
