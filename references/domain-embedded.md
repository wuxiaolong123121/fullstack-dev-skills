# Embedded Systems 参考

> Reference for: fullstack-dev-skills
> Load when: 用户请求嵌入式开发、IoT 设备、固件开发、实时系统、RTOS 相关任务

## 核心特性

嵌入式系统开发是软件与硬件结合的专业领域：

- **固件开发**：底层硬件控制程序
- **RTOS**：实时操作系统（FreeRTOS、Zephyr、RT-Thread）
- **IoT 协议**：MQTT、CoAP、LwM2M
- **外设驱动**：GPIO、I2C、SPI、UART
- **低功耗设计**：电池供电设备的电源管理
- **交叉编译**：目标平台代码构建

## 最佳实践

### GPIO 控制示例 (C)

```c
/**
 * @file gpio_driver.h
 * @brief GPIO 驱动头文件
 * 提供通用 GPIO 控制接口
 */

#ifndef GPIO_DRIVER_H
#define GPIO_DRIVER_H

#include <stdint.h>
#include <stdbool.h>

/**
 * @brief GPIO 引脚模式枚举
 */
typedef enum {
    GPIO_MODE_INPUT,          /**< 输入模式 */
    GPIO_MODE_OUTPUT,         /**< 输出模式 */
    GPIO_MODE_INPUT_PULLUP,   /**< 输入上拉模式 */
    GPIO_MODE_INPUT_PULLDOWN, /**< 输入下拉模式 */
    GPIO_MODE_OUTPUT_OPENDRAIN /**< 开漏输出模式 */
} GpioMode;

/**
 * @brief GPIO 电平枚举
 */
typedef enum {
    GPIO_LEVEL_LOW  = 0, /**< 低电平 */
    GPIO_LEVEL_HIGH = 1  /**< 高电平 */
} GpioLevel;

/**
 * @brief GPIO 中断触发类型枚举
 */
typedef enum {
    GPIO_IRQ_TRIGGER_RISING,  /**< 上升沿触发 */
    GPIO_IRQ_TRIGGER_FALLING, /**< 下降沿触发 */
    GPIO_IRQ_TRIGGER_BOTH     /**< 双边沿触发 */
} GpioIrqTrigger;

/**
 * @brief GPIO 中断回调函数类型
 * @param pin 触发中断的引脚号
 * @param userData 用户数据指针
 */
typedef void (*GpioIrqCallback)(uint8_t pin, void *userData);

/**
 * @brief 初始化 GPIO 引脚
 * @param pin 引脚号
 * @param mode 引脚模式
 * @return 成功返回 0，失败返回负值
 */
int gpio_init(uint8_t pin, GpioMode mode);

/**
 * @brief 设置 GPIO 输出电平
 * @param pin 引脚号
 * @param level 输出电平
 * @return 成功返回 0，失败返回负值
 */
int gpio_write(uint8_t pin, GpioLevel level);

/**
 * @brief 读取 GPIO 输入电平
 * @param pin 引脚号
 * @return 当前电平值
 */
GpioLevel gpio_read(uint8_t pin);

/**
 * @brief 切换 GPIO 输出电平
 * @param pin 引脚号
 * @return 成功返回 0，失败返回负值
 */
int gpio_toggle(uint8_t pin);

/**
 * @brief 注册 GPIO 中断回调
 * @param pin 引脚号
 * @param trigger 触发类型
 * @param callback 回调函数
 * @param userData 用户数据
 * @return 成功返回 0，失败返回负值
 */
int gpio_register_irq(uint8_t pin, GpioIrqTrigger trigger, 
                      GpioIrqCallback callback, void *userData);

/**
 * @brief 使能 GPIO 中断
 * @param pin 引脚号
 * @return 成功返回 0，失败返回负值
 */
int gpio_enable_irq(uint8_t pin);

/**
 * @brief 禁用 GPIO 中断
 * @param pin 引脚号
 * @return 成功返回 0，失败返回负值
 */
int gpio_disable_irq(uint8_t pin);

#endif /* GPIO_DRIVER_H */
```

```c
/**
 * @file gpio_driver.c
 * @brief GPIO 驱动实现
 */

#include "gpio_driver.h"
#include <string.h>

#define MAX_GPIO_PINS 32

/**
 * @brief GPIO 中断上下文结构体
 */
typedef struct {
    GpioIrqCallback callback;
    void *userData;
    bool enabled;
} GpioIrqContext;

static GpioIrqContext irqContexts[MAX_GPIO_PINS];

/**
 * @brief 初始化 GPIO 引脚
 */
int gpio_init(uint8_t pin, GpioMode mode) {
    if (pin >= MAX_GPIO_PINS) {
        return -1;
    }

    GPIO_InitTypeDef initStruct = {0};
    
    switch (mode) {
        case GPIO_MODE_INPUT:
            initStruct.Mode = GPIO_MODE_INPUT;
            initStruct.Pull = GPIO_NOPULL;
            break;
        case GPIO_MODE_OUTPUT:
            initStruct.Mode = GPIO_MODE_OUTPUT_PP;
            initStruct.Pull = GPIO_NOPULL;
            initStruct.Speed = GPIO_SPEED_FREQ_HIGH;
            break;
        case GPIO_MODE_INPUT_PULLUP:
            initStruct.Mode = GPIO_MODE_INPUT;
            initStruct.Pull = GPIO_PULLUP;
            break;
        case GPIO_MODE_INPUT_PULLDOWN:
            initStruct.Mode = GPIO_MODE_INPUT;
            initStruct.Pull = GPIO_PULLDOWN;
            break;
        case GPIO_MODE_OUTPUT_OPENDRAIN:
            initStruct.Mode = GPIO_MODE_OUTPUT_OD;
            initStruct.Pull = GPIO_NOPULL;
            initStruct.Speed = GPIO_SPEED_FREQ_HIGH;
            break;
        default:
            return -2;
    }

    HAL_GPIO_Init(getGpioPort(pin), &initStruct);
    return 0;
}

/**
 * @brief 设置 GPIO 输出电平
 */
int gpio_write(uint8_t pin, GpioLevel level) {
    if (pin >= MAX_GPIO_PINS) {
        return -1;
    }

    GPIO_PinState state = (level == GPIO_LEVEL_HIGH) ? GPIO_PIN_SET : GPIO_PIN_RESET;
    HAL_GPIO_WritePin(getGpioPort(pin), getGpioPin(pin), state);
    return 0;
}

/**
 * @brief 读取 GPIO 输入电平
 */
GpioLevel gpio_read(uint8_t pin) {
    if (pin >= MAX_GPIO_PINS) {
        return GPIO_LEVEL_LOW;
    }

    GPIO_PinState state = HAL_GPIO_ReadPin(getGpioPort(pin), getGpioPin(pin));
    return (state == GPIO_PIN_SET) ? GPIO_LEVEL_HIGH : GPIO_LEVEL_LOW;
}

/**
 * @brief 切换 GPIO 输出电平
 */
int gpio_toggle(uint8_t pin) {
    if (pin >= MAX_GPIO_PINS) {
        return -1;
    }

    HAL_GPIO_TogglePin(getGpioPort(pin), getGpioPin(pin));
    return 0;
}

/**
 * @brief 注册 GPIO 中断回调
 */
int gpio_register_irq(uint8_t pin, GpioIrqTrigger trigger,
                      GpioIrqCallback callback, void *userData) {
    if (pin >= MAX_GPIO_PINS || callback == NULL) {
        return -1;
    }

    irqContexts[pin].callback = callback;
    irqContexts[pin].userData = userData;
    irqContexts[pin].enabled = false;

    uint32_t extiTrigger;
    switch (trigger) {
        case GPIO_IRQ_TRIGGER_RISING:
            extiTrigger = GPIO_TRIGGER_RISING;
            break;
        case GPIO_IRQ_TRIGGER_FALLING:
            extiTrigger = GPIO_TRIGGER_FALLING;
            break;
        case GPIO_IRQ_TRIGGER_BOTH:
            extiTrigger = GPIO_TRIGGER_RISING_FALLING;
            break;
        default:
            return -2;
    }

    configureExti(pin, extiTrigger);
    return 0;
}

/**
 * @brief GPIO 中断处理函数
 * @param pin 触发中断的引脚号
 */
void gpio_irq_handler(uint8_t pin) {
    if (pin < MAX_GPIO_PINS && irqContexts[pin].enabled && irqContexts[pin].callback) {
        irqContexts[pin].callback(pin, irqContexts[pin].userData);
    }
}
```

### FreeRTOS 任务示例

```c
/**
 * @file sensor_task.c
 * @brief 传感器采集任务
 * 使用 FreeRTOS 实现周期性传感器数据采集
 */

#include "FreeRTOS.h"
#include "task.h"
#include "queue.h"
#include "semphr.h"
#include "gpio_driver.h"

#define SENSOR_TASK_STACK_SIZE  512
#define SENSOR_TASK_PRIORITY    2
#define SENSOR_QUEUE_LENGTH     10

/**
 * @brief 传感器数据结构体
 */
typedef struct {
    uint32_t timestamp;
    float temperature;
    float humidity;
    uint16_t light;
} SensorData;

/**
 * @brief 任务句柄
 */
static TaskHandle_t sensorTaskHandle = NULL;
static QueueHandle_t sensorQueue = NULL;
static SemaphoreHandle_t i2cMutex = NULL;

/**
 * @brief 传感器采集任务
 * @param pvParameters 任务参数
 */
static void sensor_task(void *pvParameters) {
    SensorData data;
    TickType_t lastWakeTime = xTaskGetTickCount();
    const TickType_t period = pdMS_TO_TICKS(1000);

    while (1) {
        vTaskDelayUntil(&lastWakeTime, period);

        data.timestamp = getSystemTimestamp();

        if (xSemaphoreTake(i2cMutex, pdMS_TO_TICKS(100)) == pdTRUE) {
            data.temperature = readTemperature();
            data.humidity = readHumidity();
            data.light = readLightSensor();
            xSemaphoreGive(i2cMutex);
        }

        if (xQueueSend(sensorQueue, &data, pdMS_TO_TICKS(10)) != pdPASS) {
            handleQueueError();
        }
    }
}

/**
 * @brief 初始化传感器任务
 * @return 成功返回 0，失败返回负值
 */
int sensor_task_init(void) {
    sensorQueue = xQueueCreate(SENSOR_QUEUE_LENGTH, sizeof(SensorData));
    if (sensorQueue == NULL) {
        return -1;
    }

    i2cMutex = xSemaphoreCreateMutex();
    if (i2cMutex == NULL) {
        vQueueDelete(sensorQueue);
        return -2;
    }

    BaseType_t result = xTaskCreate(
        sensor_task,
        "SensorTask",
        SENSOR_TASK_STACK_SIZE,
        NULL,
        SENSOR_TASK_PRIORITY,
        &sensorTaskHandle
    );

    if (result != pdPASS) {
        vQueueDelete(sensorQueue);
        vSemaphoreDelete(i2cMutex);
        return -3;
    }

    return 0;
}

/**
 * @brief 获取传感器数据队列
 * @return 队列句柄
 */
QueueHandle_t sensor_get_queue(void) {
    return sensorQueue;
}
```

### MQTT 客户端示例

```c
/**
 * @file mqtt_client.c
 * @brief MQTT 客户端实现
 * 用于 IoT 设备与云平台通信
 */

#include "mqtt_client.h"
#include "lwip/sockets.h"
#include "lwip/dns.h"
#include <string.h>

#define MQTT_KEEPALIVE_INTERVAL  60
#define MQTT_BUFFER_SIZE         1024

/**
 * @brief MQTT 客户端上下文结构体
 */
typedef struct {
    int socket;
    char clientId[64];
    char username[64];
    char password[64];
    uint16_t keepAlive;
    uint16_t nextPacketId;
    uint8_t txBuffer[MQTT_BUFFER_SIZE];
    uint8_t rxBuffer[MQTT_BUFFER_SIZE];
    MqttMessageCallback messageCallback;
    void *userData;
    bool connected;
} MqttContext;

static MqttContext mqttCtx;

/**
 * @brief 连接到 MQTT 服务器
 * @param config 连接配置
 * @return 成功返回 0，失败返回负值
 */
int mqtt_connect(const MqttConfig *config) {
    struct sockaddr_in serverAddr;
    struct hostent *hostEntry;

    hostEntry = gethostbyname(config->host);
    if (hostEntry == NULL) {
        return -1;
    }

    mqttCtx.socket = socket(AF_INET, SOCK_STREAM, 0);
    if (mqttCtx.socket < 0) {
        return -2;
    }

    memset(&serverAddr, 0, sizeof(serverAddr));
    serverAddr.sin_family = AF_INET;
    serverAddr.sin_port = htons(config->port);
    memcpy(&serverAddr.sin_addr, hostEntry->h_addr, hostEntry->h_length);

    if (connect(mqttCtx.socket, (struct sockaddr *)&serverAddr, sizeof(serverAddr)) < 0) {
        close(mqttCtx.socket);
        return -3;
    }

    strncpy(mqttCtx.clientId, config->clientId, sizeof(mqttCtx.clientId) - 1);
    strncpy(mqttCtx.username, config->username, sizeof(mqttCtx.username) - 1);
    strncpy(mqttCtx.password, config->password, sizeof(mqttCtx.password) - 1);
    mqttCtx.keepAlive = config->keepAlive > 0 ? config->keepAlive : MQTT_KEEPALIVE_INTERVAL;
    mqttCtx.messageCallback = config->messageCallback;
    mqttCtx.userData = config->userData;

    return sendConnectPacket();
}

/**
 * @brief 发布消息
 * @param topic 主题
 * @param payload 消息负载
 * @param len 负载长度
 * @param qos 服务质量等级
 * @return 成功返回 0，失败返回负值
 */
int mqtt_publish(const char *topic, const uint8_t *payload, uint16_t len, uint8_t qos) {
    if (!mqttCtx.connected || topic == NULL || payload == NULL) {
        return -1;
    }

    uint16_t topicLen = strlen(topic);
    uint16_t packetId = (qos > 0) ? mqttCtx.nextPacketId++ : 0;

    uint8_t *ptr = mqttCtx.txBuffer;
    
    *ptr++ = MQTT_MSG_PUBLISH | (qos << 1);
    
    uint16_t remainingLen = 2 + topicLen + len;
    if (qos > 0) {
        remainingLen += 2;
    }
    
    ptr += encodeRemainingLength(ptr, remainingLen);
    
    *ptr++ = (topicLen >> 8) & 0xFF;
    *ptr++ = topicLen & 0xFF;
    memcpy(ptr, topic, topicLen);
    ptr += topicLen;
    
    if (qos > 0) {
        *ptr++ = (packetId >> 8) & 0xFF;
        *ptr++ = packetId & 0xFF;
    }
    
    memcpy(ptr, payload, len);
    ptr += len;

    uint16_t totalLen = ptr - mqttCtx.txBuffer;
    if (send(mqttCtx.socket, mqttCtx.txBuffer, totalLen, 0) != totalLen) {
        return -2;
    }

    return 0;
}

/**
 * @brief 订阅主题
 * @param topic 主题
 * @param qos 服务质量等级
 * @return 成功返回 0，失败返回负值
 */
int mqtt_subscribe(const char *topic, uint8_t qos) {
    if (!mqttCtx.connected || topic == NULL) {
        return -1;
    }

    uint16_t topicLen = strlen(topic);
    uint16_t packetId = mqttCtx.nextPacketId++;

    uint8_t *ptr = mqttCtx.txBuffer;
    
    *ptr++ = MQTT_MSG_SUBSCRIBE | 0x02;
    
    uint16_t remainingLen = 2 + 2 + topicLen + 1;
    ptr += encodeRemainingLength(ptr, remainingLen);
    
    *ptr++ = (packetId >> 8) & 0xFF;
    *ptr++ = packetId & 0xFF;
    
    *ptr++ = (topicLen >> 8) & 0xFF;
    *ptr++ = topicLen & 0xFF;
    memcpy(ptr, topic, topicLen);
    ptr += topicLen;
    
    *ptr++ = qos;

    uint16_t totalLen = ptr - mqttCtx.txBuffer;
    if (send(mqttCtx.socket, mqttCtx.txBuffer, totalLen, 0) != totalLen) {
        return -2;
    }

    return 0;
}

/**
 * @brief 断开 MQTT 连接
 */
void mqtt_disconnect(void) {
    if (mqttCtx.connected) {
        uint8_t disconnectPacket[2] = {MQTT_MSG_DISCONNECT, 0};
        send(mqttCtx.socket, disconnectPacket, 2, 0);
        mqttCtx.connected = false;
    }
    
    if (mqttCtx.socket >= 0) {
        close(mqttCtx.socket);
        mqttCtx.socket = -1;
    }
}

/**
 * @brief 编码剩余长度
 * @param buffer 缓冲区
 * @param length 长度值
 * @return 编码后的字节数
 */
static int encodeRemainingLength(uint8_t *buffer, uint16_t length) {
    int bytes = 0;
    
    do {
        uint8_t encodedByte = length % 128;
        length /= 128;
        if (length > 0) {
            encodedByte |= 0x80;
        }
        buffer[bytes++] = encodedByte;
    } while (length > 0);
    
    return bytes;
}
```

### 低功耗管理示例

```c
/**
 * @file power_manager.c
 * @brief 电源管理模块
 * 实现设备低功耗模式控制
 */

#include "power_manager.h"

/**
 * @brief 电源模式枚举
 */
typedef enum {
    POWER_MODE_ACTIVE,      /**< 活动模式 */
    POWER_MODE_LOW_POWER,   /**< 低功耗模式 */
    POWER_MODE_SLEEP,       /**< 睡眠模式 */
    POWER_MODE_DEEP_SLEEP,  /**< 深度睡眠模式 */
    POWER_MODE_SHUTDOWN     /**< 关机模式 */
} PowerMode;

/**
 * @brief 电源管理上下文
 */
typedef struct {
    PowerMode currentMode;
    uint32_t wakeupSources;
    uint32_t lastActivityTime;
    uint32_t inactivityTimeout;
    PowerModeCallback modeChangeCallback;
} PowerContext;

static PowerContext powerCtx;

/**
 * @brief 初始化电源管理
 * @param config 配置参数
 * @return 成功返回 0，失败返回负值
 */
int power_manager_init(const PowerConfig *config) {
    powerCtx.currentMode = POWER_MODE_ACTIVE;
    powerCtx.wakeupSources = 0;
    powerCtx.lastActivityTime = getSystemTick();
    powerCtx.inactivityTimeout = config->inactivityTimeout;
    powerCtx.modeChangeCallback = config->modeChangeCallback;

    enableLowPowerClocks();
    configureWakeupPins(config->wakeupPins);

    return 0;
}

/**
 * @brief 进入指定电源模式
 * @param mode 目标电源模式
 * @return 成功返回 0，失败返回负值
 */
int power_enter_mode(PowerMode mode) {
    if (mode == powerCtx.currentMode) {
        return 0;
    }

    switch (mode) {
        case POWER_MODE_ACTIVE:
            exitLowPowerMode();
            break;
            
        case POWER_MODE_LOW_POWER:
            configureLowPowerMode();
            break;
            
        case POWER_MODE_SLEEP:
            configureSleepMode();
            __WFI();
            break;
            
        case POWER_MODE_DEEP_SLEEP:
            configureDeepSleepMode(powerCtx.wakeupSources);
            __WFI();
            break;
            
        case POWER_MODE_SHUTDOWN:
            configureShutdownMode();
            break;
    }

    PowerMode previousMode = powerCtx.currentMode;
    powerCtx.currentMode = mode;

    if (powerCtx.modeChangeCallback) {
        powerCtx.modeChangeCallback(previousMode, mode);
    }

    return 0;
}

/**
 * @brief 报告活动事件
 * 用于重置不活动计时器
 */
void power_report_activity(void) {
    powerCtx.lastActivityTime = getSystemTick();
    
    if (powerCtx.currentMode != POWER_MODE_ACTIVE) {
        power_enter_mode(POWER_MODE_ACTIVE);
    }
}

/**
 * @brief 电源管理任务
 * 检查不活动超时并切换电源模式
 */
void power_manager_task(void) {
    uint32_t currentTime = getSystemTick();
    uint32_t elapsed = currentTime - powerCtx.lastActivityTime;

    if (elapsed > powerCtx.inactivityTimeout) {
        if (powerCtx.currentMode == POWER_MODE_ACTIVE) {
            power_enter_mode(POWER_MODE_LOW_POWER);
        } else if (powerCtx.currentMode == POWER_MODE_LOW_POWER &&
                   elapsed > powerCtx.inactivityTimeout * 2) {
            power_enter_mode(POWER_MODE_SLEEP);
        }
    }
}

/**
 * @brief 注册唤醒源
 * @param source 唤醒源
 */
void power_register_wakeup_source(uint32_t source) {
    powerCtx.wakeupSources |= source;
}

/**
 * @brief 获取当前电源模式
 * @return 当前电源模式
 */
PowerMode power_get_current_mode(void) {
    return powerCtx.currentMode;
}
```

## Quick Reference

### 常用通信协议

| 协议 | 速度 | 距离 | 用途 |
|-----|------|------|------|
| I2C | 100kHz-3.4MHz | 板级 | 传感器、EEPROM |
| SPI | 可达数MHz | 板级 | Flash、显示屏 |
| UART | 9600-921600bps | 短距离 | 调试、模块通信 |
| CAN | 1Mbps | 40m | 汽车、工业 |
| RS485 | 10Mbps | 1200m | 工业控制 |
| 1-Wire | 16kbps | 100m | 温度传感器 |

### RTOS 任务状态

| 状态 | 说明 |
|-----|------|
| Running | 正在执行的任务 |
| Ready | 就绪等待执行 |
| Blocked | 等待资源或事件 |
| Suspended | 被挂起 |

### 常用低功耗模式

| 模式 | 功耗 | 唤醒时间 | 保持状态 |
|-----|------|---------|---------|
| Idle | ~mA | μs | 全部 |
| Sleep | ~μA | ms | RAM |
| Deep Sleep | ~μA | ms | 部分RAM |
| Shutdown | ~nA | s | 无 |

### 内存对齐宏

```c
#define ALIGN_4BYTES    __attribute__((aligned(4)))
#define ALIGN_8BYTES    __attribute__((aligned(8)))
#define PACKED          __attribute__((packed))
#define WEAK            __attribute__((weak))
```
