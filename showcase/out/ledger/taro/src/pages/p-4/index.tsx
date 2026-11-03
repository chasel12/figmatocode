import { View, Text, Image, Button } from '@tarojs/components'
import './index.scss'

export default function PageP4() {
  return (
    <View id="page-507" className="page-1">
      <View className="frame-1">
        <View className="frame-2">
          <svg className="vector-1" width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" fillRule="nonzero" stroke="#1c2024" strokeWidth="2.4" ><path d="m15 18-6-6 6-6" /></svg>
        </View>
        <Text className="text-1">{"预算"}</Text>
        <View className="frame-3">
          <Text className="text-2">{"11 月"}</Text>
        </View>
      </View>
      <View className="frame-4">
        <View className="frame-5">
          <Text className="text-3">{"TOTAL BUDGET"}</Text>
          <View className="frame-6">
            <Text className="text-4">{"71%"}</Text>
            <Text className="text-5">{"已用 ¥4,286.50 / 总预算 ¥6,000.00"}</Text>
          </View>
          <View className="frame-7">
            <View className="rectangle-1"></View>
          </View>
          <View className="frame-8">
            <Text className="text-6">{"本月剩余可用"}</Text>
            <Text className="text-7">{"¥1,713.50"}</Text>
          </View>
        </View>
      </View>
      <View className="frame-9">
        <View className="frame-10">
          <Text className="text-8">{"分类预算"}</Text>
          <Text className="text-9">{"6 项"}</Text>
        </View>
        <View className="frame-11">
          <View className="frame-12">
            <Text className="text-10">{"餐饮"}</Text>
            <Text className="text-11">{"¥1,286.50 / ¥1,500.00"}</Text>
          </View>
          <View className="frame-13">
            <View className="rectangle-2"></View>
          </View>
        </View>
        <View className="frame-14">
          <View className="frame-15">
            <Text className="text-12">{"交通"}</Text>
            <Text className="text-13">{"¥386.00 / ¥500.00"}</Text>
          </View>
          <View className="frame-16">
            <View className="rectangle-3"></View>
          </View>
        </View>
        <View className="frame-17">
          <View className="frame-18">
            <Text className="text-14">{"购物"}</Text>
            <Text className="text-15">{"¥940.00 / ¥1,200.00"}</Text>
          </View>
          <View className="frame-19">
            <View className="rectangle-4"></View>
          </View>
        </View>
        <View className="frame-20">
          <View className="frame-21">
            <Text className="text-16">{"娱乐"}</Text>
            <Text className="text-17">{"¥520.00 / ¥600.00"}</Text>
          </View>
          <View className="frame-22">
            <View className="rectangle-5"></View>
          </View>
        </View>
        <View className="frame-23">
          <View className="frame-24">
            <Text className="text-18">{"居家"}</Text>
            <Text className="text-19">{"¥468.00 / ¥800.00"}</Text>
          </View>
          <View className="frame-25">
            <View className="rectangle-6"></View>
          </View>
        </View>
        <View className="frame-26">
          <View className="frame-27">
            <Text className="text-20">{"学习"}</Text>
            <View className="frame-28">
              <Text className="text-21">{"已超支"}</Text>
            </View>
          </View>
          <Text className="text-22">{"¥1,180.00 / ¥1,000.00"}</Text>
          <View className="frame-29">
            <View className="rectangle-7"></View>
          </View>
        </View>
      </View>
      <View className="frame-30">
        <Button className="button-1">{"调整预算"}</Button>
        <Button className="button-2">{"查看预算明细"}</Button>
      </View>
    </View>
  )
}
