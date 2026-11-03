import { View, Text, Image, Button } from '@tarojs/components'
import Taro from '@tarojs/taro'
import './index.scss'

export default function PageP3() {
  return (
    <View id="page-229" className="page-1">
      <View className="frame-1">
        <Text className="text-1">{"记一笔"}</Text>
        <View className="frame-2">
          <svg className="vector-1" width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" fillRule="nonzero" stroke="#60646c" strokeWidth="3" ><path d="M18 6 6 18m6 6 12 12" /></svg>
        </View>
      </View>
      <View className="frame-3">
        <View className="frame-4">
          <Text className="text-2">{"¥"}</Text>
          <Text className="text-3">{"1286.50"}</Text>
        </View>
        <View className="rectangle-1"></View>
      </View>
      <View className="frame-5">
        <View className="frame-6">
          <Text className="text-4">{"支出"}</Text>
        </View>
        <View className="frame-7">
          <Text className="text-5">{"收入"}</Text>
        </View>
      </View>
      <View className="frame-8">
        <View className="frame-9">
          <View className="frame-10">
            <svg className="vector-2" width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" fillRule="nonzero" stroke="#ffffff" strokeWidth="2.4" ><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2M7 2v20M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" /></svg>
          </View>
          <Text className="text-6">{"餐饮"}</Text>
        </View>
        <View className="frame-11">
          <View className="frame-12">
            <svg className="vector-3" width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" fillRule="nonzero" stroke="#60646c" strokeWidth="2.4" ><path d="M8 6v6M15 6v6M2 12h19.6M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H4a2 2 0 0 0-2 2v10h3M5 18a2 2 0 1 0 4 0a2 2 0 1 0 -4 0M9 18h5M14 18a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" /></svg>
          </View>
          <Text className="text-7">{"交通"}</Text>
        </View>
        <View className="frame-13">
          <View className="frame-14">
            <svg className="vector-4" width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" fillRule="nonzero" stroke="#60646c" strokeWidth="2.4" ><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4ZM3 6h18M16 10a4 4 0 0 1-8 0" /></svg>
          </View>
          <Text className="text-8">{"购物"}</Text>
        </View>
        <View className="frame-15">
          <View className="frame-16">
            <svg className="vector-5" width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" fillRule="nonzero" stroke="#60646c" strokeWidth="2.4" ><path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></svg>
          </View>
          <Text className="text-9">{"居家"}</Text>
        </View>
        <View className="frame-17">
          <View className="frame-18">
            <svg className="vector-6" width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" fillRule="nonzero" stroke="#60646c" strokeWidth="2.4" ><path d="M6 11L10 11M8 9L8 13M15 12L15.01 12M18 10L18.01 10M17.32 5H6.68a4 4 0 0 0-3.978 3.59c-.006.052-.01.101-.017.152C2.604 9.416 2 14.456 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 0 1 9.828 16h4.344a2 2 0 0 1 1.414.586L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.545-.604-6.584-.685-7.258-.007-.05-.011-.1-.017-.151A4 4 0 0 0 17.32 5z" /></svg>
          </View>
          <Text className="text-10">{"娱乐"}</Text>
        </View>
        <View className="frame-19">
          <View className="frame-20">
            <svg className="vector-7" width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" fillRule="nonzero" stroke="#60646c" strokeWidth="2.4" ><path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Zm8.5 8.5 7 7" /></svg>
          </View>
          <Text className="text-11">{"医疗"}</Text>
        </View>
        <View className="frame-21">
          <View className="frame-22">
            <svg className="vector-8" width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" fillRule="nonzero" stroke="#60646c" strokeWidth="2.4" ><path d="M12 7v14M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z" /></svg>
          </View>
          <Text className="text-12">{"学习"}</Text>
        </View>
        <View className="frame-23">
          <View className="frame-24">
            <svg className="vector-9" width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" fillRule="nonzero" stroke="#60646c" strokeWidth="2.4" ><path d="M4 8h16a1 1 0 0 1 1 1v2a1 1 0 0 1 -1 1h-16a1 1 0 0 1 -1 -1v-2a1 1 0 0 1 1 -1ZM12 8v13M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5" /></svg>
          </View>
          <Text className="text-13">{"人情"}</Text>
        </View>
        <View className="frame-25">
          <View className="frame-26">
            <svg className="vector-10" width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" fillRule="nonzero" stroke="#60646c" strokeWidth="2.4" ><path d="M11 12a1 1 0 1 0 2 0a1 1 0 1 0 -2 0M18 12a1 1 0 1 0 2 0a1 1 0 1 0 -2 0M4 12a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" /></svg>
          </View>
          <Text className="text-14">{"其他"}</Text>
        </View>
      </View>
      <View className="frame-27">
        <View className="frame-28">
          <Text className="text-15">{"楼下面馆"}</Text>
        </View>
        <View className="frame-29">
          <View className="frame-30">
            <svg className="vector-11" width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" fillRule="nonzero" stroke="#60646c" strokeWidth="3" ><path d="M8 2v4M16 2v4M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2ZM3 10h18" /></svg>
            <Text className="text-16">{"11 月 28 日"}</Text>
            <Text className="text-17">{"今天"}</Text>
          </View>
          <svg className="vector-12" width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" fillRule="nonzero" stroke="#94a3b8" strokeWidth="3" ><path d="m9 18 6-6-6-6" /></svg>
        </View>
      </View>
      <View className="frame-31" onClick={() => { Taro.navigateTo({ url: "/pages/p-2/index" }) }}>
        <Button className="button-1">{"保存"}</Button>
      </View>
    </View>
  )
}
