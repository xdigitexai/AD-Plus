export type MetricSnapshot={clicks:number;conversions:number;cpa:number;roas:number;spend:number;revenue:number};
type Condition={metric:keyof MetricSnapshot;operator:"gt"|"gte"|"lt"|"lte"|"eq";value:number};
export function evaluateConditions(snapshot:MetricSnapshot,conditions:Condition[]){return conditions.every(c=>{const current=snapshot[c.metric];if(c.operator==="gt")return current>c.value;if(c.operator==="gte")return current>=c.value;if(c.operator==="lt")return current<c.value;if(c.operator==="lte")return current<=c.value;return current===c.value})}
