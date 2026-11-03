import { View, Text, Image, Button } from '@tarojs/components'
import Taro from '@tarojs/taro'
import './index.scss'

export default function PageP6() {
  return (
    <View id="page-271" className="page-1">
      <View className="frame-1">
        <Text className="text-1">{"PROFILE"}</Text>
        <Text className="text-2">{"我的"}</Text>
      </View>
      <View className="rectangle-1"></View>
      <View className="frame-2">
        <svg className="oval-1" width="64" height="64" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="#E2E0DB" fillRule="nonzero" stroke="#111111" strokeWidth="1" ><path d="M 64 32 C 64 49.67 49.67 64 32 64 C 14.33 64 0 49.67 0 32 C 0 14.33 14.33 0 32 0 C 49.67 0 64 14.33 64 32 Z" /></svg>
        <View className="frame-3">
          <Text className="text-3">{"陈默"}</Text>
          <Text className="text-4">{"训练第 3 年"}</Text>
        </View>
      </View>
      <View className="rectangle-2"></View>
      <View className="frame-4">
        <View className="frame-5">
          <View className="frame-6">
            <Text className="text-5">{"186"}</Text>
            <Text className="text-6">{"次"}</Text>
          </View>
          <Text className="text-7">{"训练次数"}</Text>
        </View>
        <View className="frame-7">
          <View className="frame-8">
            <Text className="text-8">{"12"}</Text>
            <Text className="text-9">{"周"}</Text>
          </View>
          <Text className="text-10">{"连续周期"}</Text>
        </View>
        <View className="frame-9">
          <View className="frame-10">
            <Text className="text-11">{"1240"}</Text>
            <Text className="text-12">{"吨"}</Text>
          </View>
          <Text className="text-13">{"累计负荷"}</Text>
        </View>
      </View>
      <View className="rectangle-3"></View>
      <View className="frame-11">
        <View className="frame-12">
          <Text className="text-14">{"训练记录"}</Text>
          <svg className="vector-1" width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" fillRule="nonzero" stroke="#A3A3A3" strokeWidth="3" ><path d="m9 18 6-6-6-6" /></svg>
        </View>
        <View className="frame-13">
          <Text className="text-15">{"进度曲线"}</Text>
          <svg className="vector-2" width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" fillRule="nonzero" stroke="#A3A3A3" strokeWidth="3" ><path d="m9 18 6-6-6-6" /></svg>
        </View>
        <View className="frame-14">
          <Text className="text-16">{"单位设置"}</Text>
          <svg className="vector-3" width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" fillRule="nonzero" stroke="#A3A3A3" strokeWidth="3" ><path d="m9 18 6-6-6-6" /></svg>
        </View>
        <View className="frame-15">
          <Text className="text-17">{"导出数据"}</Text>
          <svg className="vector-4" width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" fillRule="nonzero" stroke="#A3A3A3" strokeWidth="3" ><path d="m9 18 6-6-6-6" /></svg>
        </View>
        <View className="frame-16">
          <Text className="text-18">{"关于铁志"}</Text>
          <svg className="vector-5" width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" fillRule="nonzero" stroke="#A3A3A3" strokeWidth="3" ><path d="m9 18 6-6-6-6" /></svg>
        </View>
      </View>
      <View className="rectangle-4"></View>
      <View className="frame-17">
        <View className="frame-18" onClick={() => { Taro.reLaunch({ url: "/pages/p-1/index" }) }}>
          <Text className="text-19">{"今日"}</Text>
        </View>
        <View className="frame-19" onClick={() => { Taro.reLaunch({ url: "/pages/p-3/index" }) }}>
          <Text className="text-20">{"动作库"}</Text>
        </View>
        <View className="frame-20">
          <Text className="text-21">{"我的"}</Text>
          <View className="rectangle-5"></View>
        </View>
      </View>
    </View>
  )
}
