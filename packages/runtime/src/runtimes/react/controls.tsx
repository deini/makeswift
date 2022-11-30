import { useRef } from 'react'

import { useDocumentKey, useSelector, useStore } from '.'
import * as ReactPage from '../../state/react-page'
import { Props } from '../../prop-controllers'
import {
  Descriptor,
  ResolveOptions,
  ResponsiveValue,
  WidthPropControllerFormat,
  WidthDescriptor,
  WidthValue,
} from '../../prop-controllers/descriptors'
import { useResponsiveColor } from '../../components/hooks'
import type { ColorValue } from '../../components/utils/types'
import { responsiveWidth } from '../../components/utils/responsive-style'
import {
  CheckboxControlType,
  ColorControlType,
  ComboboxControlType,
  ImageControlType,
  LinkControlType,
  ListControlType,
  NumberControlType,
  SelectControlType,
  ShapeControlType,
  SlotControl,
  SlotControlType,
  StyleControlType,
  TextAreaControlType,
  TextInputControlType,
} from '../../controls'
import { useFormattedStyle } from './controls/style'
import { ControlValue } from './controls/control'
import { RenderHook } from './components'
import { useSlot } from './controls/slot'
import { useStyle } from './use-style'

export type ResponsiveColor = ResponsiveValue<ColorValue>

function useWidthStyle(value: WidthValue | undefined, descriptor: WidthDescriptor): string {
  return useStyle(responsiveWidth(value, descriptor.options.defaultValue))
}

export type ResolveWidthControlValue<T extends Descriptor> = T extends WidthDescriptor
  ? undefined extends ResolveOptions<T['options']>['format']
    ? WidthValue | undefined
    : ResolveOptions<T['options']>['format'] extends typeof WidthPropControllerFormat.ClassName
    ? string
    : ResolveOptions<
        T['options']
      >['format'] extends typeof WidthPropControllerFormat.ResponsiveValue
    ? WidthValue | undefined
    : never
  : never

type PropsValueProps = {
  element: ReactPage.ElementData
  children(props: Record<string, unknown>): JSX.Element
}

export function PropsValue({ element, children }: PropsValueProps): JSX.Element {
  const store = useStore()
  const propControllerDescriptorsRef = useRef(
    ReactPage.getComponentPropControllerDescriptors(store.getState(), element.type) ?? {},
  )
  const props = element.props as Record<string, any>
  const documentKey = useDocumentKey()

  const propControllers = useSelector(state => {
    if (documentKey == null) return null

    return ReactPage.getPropControllers(state, documentKey, element.key)
  })

  return Object.entries(propControllerDescriptorsRef.current).reduceRight(
    (renderFn, [propName, descriptor]) =>
      propsValue => {
        switch (descriptor.type) {
          case CheckboxControlType:
          case NumberControlType:
          case TextInputControlType:
          case TextAreaControlType:
          case SelectControlType:
          case ColorControlType:
          case ImageControlType:
          case ComboboxControlType:
          case ShapeControlType:
          case ListControlType:
          case LinkControlType:
            return (
              <ControlValue definition={descriptor} data={props[propName]}>
                {value => renderFn({ ...propsValue, [propName]: value })}
              </ControlValue>
            )

          case StyleControlType:
            return (
              <RenderHook
                key={descriptor.type}
                hook={useFormattedStyle}
                parameters={[props[propName], descriptor]}
              >
                {value => renderFn({ ...propsValue, [propName]: value })}
              </RenderHook>
            )

          case SlotControlType: {
            const control = (propControllers?.[propName] ?? null) as SlotControl | null

            return (
              <RenderHook
                key={descriptor.type}
                hook={useSlot}
                parameters={[props[propName], control]}
              >
                {value => renderFn({ ...propsValue, [propName]: value })}
              </RenderHook>
            )
          }

          case Props.Types.Width:
            switch (descriptor.options.format) {
              case WidthPropControllerFormat.ClassName:
                return (
                  <RenderHook
                    key={descriptor.type}
                    hook={useWidthStyle}
                    parameters={[props[propName], descriptor]}
                  >
                    {value => renderFn({ ...propsValue, [propName]: value })}
                  </RenderHook>
                )

              default:
                return renderFn({ ...propsValue, [propName]: props[propName] })
            }

          case Props.Types.ResponsiveColor:
            return (
              <RenderHook
                key={descriptor.type}
                hook={useResponsiveColor}
                parameters={[props[propName]]}
              >
                {value => renderFn({ ...propsValue, [propName]: value })}
              </RenderHook>
            )

          default:
            return renderFn({ ...propsValue, [propName]: props[propName] })
        }
      },
    children,
  )({})
}
