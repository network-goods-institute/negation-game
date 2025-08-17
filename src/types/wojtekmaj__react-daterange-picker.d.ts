// ignore this file

declare module "@wojtekmaj/react-daterange-picker" {
  import { ReactElement } from "react";

  export interface DateRangePickerProps {
    onChange?: (value: [Date | null, Date | null]) => void;
    value?: [Date | null, Date | null];
    [key: string]: any;
  }

  export default function DateRangePicker(
    props: DateRangePickerProps
  ): ReactElement;
}
