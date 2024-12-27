
export type SelectItemType = { label: string; value: string | number };
export interface SelectProps {
    onChange: (v: any) => void;
    items: Array<SelectItemType>;
    className?: string;
    optionClassName?: string;
    name?: string;
    id?: string;
}

export default function Select({ onChange, items, className, optionClassName, name, id }: SelectProps) {
    return <select
        name={name}
        id={id}
        onChange={onChange}
        className={`p-2 rounded-md border bg-transparent cursor-pointer text-white lg:w-11/12 w-full focus:outline-none ${className || ''}`}
    >
        {items?.map((item: SelectItemType, index) => {
            return <option key={index} value={item?.value} className={`text-black ${optionClassName || ''}`}>
                {item?.label}
            </option>
        })}
    </select>
}