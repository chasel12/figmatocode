import { View, Text, Image, Button } from '@tarojs/components'
import './index.scss'

export default function PageP2() {
  return (
    <View id="page-326" className="page-1">
      <View className="frame-1">
        <View className="frame-2">
          <svg className="vector-1" width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" fillRule="nonzero" stroke="#111111" strokeWidth="2.4" ><path d="m15 18-6-6 6-6" /></svg>
          <Text className="text-1">{"返回"}</Text>
        </View>
        <View className="frame-3">
          <Text className="text-2">{"下次训练"}</Text>
          <svg className="vector-2" width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" fillRule="nonzero" stroke="#E23D28" strokeWidth="3" ><path d="m9 18 6-6-6-6" /></svg>
        </View>
      </View>
      <View className="rectangle-1"></View>
      <View className="frame-4">
        <View className="frame-5">
          <Text className="text-3">{"杠铃深蹲"}</Text>
          <Text className="text-4">{"训练"}</Text>
        </View>
        <View className="frame-6">
          <View className="frame-7">
            <Text className="text-5">{"100"}</Text>
            <Text className="text-6">{"kg"}</Text>
            <View className="frame-8">
              <Text className="text-7">{"第 3 / 5 组"}</Text>
            </View>
          </View>
          <View className="frame-9">
            <View className="rectangle-2"></View>
            <View className="rectangle-3"></View>
          </View>
        </View>
        <View className="frame-10">
          <View className="frame-11">
            <Text className="text-8">{"第 1 组"}</Text>
            <Text className="text-9">{"100kg × 5"}</Text>
            <Text className="text-10">{"已完成"}</Text>
          </View>
          <View className="frame-12">
            <Text className="text-11">{"第 2 组"}</Text>
            <Text className="text-12">{"102.5kg × 5"}</Text>
            <Text className="text-13">{"已完成"}</Text>
          </View>
          <View className="frame-13">
            <Text className="text-14">{"第 3 组"}</Text>
            <Text className="text-15">{"105kg × 5"}</Text>
            <Text className="text-16">{"进行中"}</Text>
          </View>
          <View className="frame-14">
            <Text className="text-17">{"第 4 组"}</Text>
            <Text className="text-18">{"105kg × 4"}</Text>
            <Text className="text-19">{"未开始"}</Text>
          </View>
          <View className="frame-15">
            <Text className="text-20">{"第 5 组"}</Text>
            <Text className="text-21">{"105kg × 3"}</Text>
            <Text className="text-22">{"未开始"}</Text>
          </View>
        </View>
        <View className="frame-16">
          <Button className="button-1">{"完成本组"}</Button>
          <View className="frame-17">
            <Button className="button-2">{"加 2.5kg"}</Button>
            <Button className="button-3">{"休息 90 秒"}</Button>
          </View>
        </View>
      </View>
    </View>
  )
}
