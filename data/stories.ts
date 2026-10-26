// Story viewer content (static).
export const ORDER: string[] = ['landlord','racheal','emmanuel','nearby','aline','moses','marie'];

export type StorySlide = { bg: string; badge: string; title: string; price: string; unit: string; loc: string };
export type StoryData = { name: string; time: string; slides: StorySlide[] };

export const STORIES: Record<string, StoryData> = {
  landlord:{name:'Nyirabukeye',time:'2h',slides:[
    {bg:'photo-1568605114967-8130f3a36994',badge:'Available Houses',title:'3 Bedroom House Near Nyabugogo',price:'120,000 RWF',unit:'/ month',loc:'Nyabugogo'},
    {bg:'photo-1522708323590-d24dbb6b0267',badge:'Single Rooms',title:'Single Room Near Campus',price:'45,000 RWF',unit:'/ month',loc:'Nyabugogo'}]},
  racheal:{name:'Racheal',time:'1h',slides:[
    {bg:'photo-1542838132-92c53300491e',badge:'Market Prices',title:'Fresh Vegetables Market Day',price:'600 RWF',unit:'/ kg',loc:'Nyabugogo Market'},
    {bg:'photo-1540420773420-3366772f4999',badge:'Student Tip',title:'Buy Early, Prices Are Lower',price:'500 RWF',unit:'/ kg onions',loc:'Nyabugogo Market'}]},
  emmanuel:{name:'Emmanuel',time:'3h',slides:[
    {bg:'photo-1546069901-ba9599a7e63c',badge:'Student Guide',title:'Cheap Food Spots Near You',price:'1,000 RWF',unit:'/ meal',loc:'Nyabugogo'}]},
  nearby:{name:'Nearby',time:'5h',slides:[
    {bg:'photo-1600585154340-be6161a56a0c',badge:'Available Houses',title:'2 Bedroom House Close To Campus',price:'80,000 RWF',unit:'/ month',loc:'Kimironko'},
    {bg:'photo-1568605114967-8130f3a36994',badge:'Available Houses',title:'Family House With Garden',price:'150,000 RWF',unit:'/ month',loc:'Kacyiru'}]},
  aline:{name:'Aline',time:'6h',slides:[
    {bg:'photo-1522708323590-d24dbb6b0267',badge:'Wanted',title:'Looking For A Single Room',price:'Under 50,000 RWF',unit:'/ month',loc:'Nyabugogo'}]},
  moses:{name:'Moses',time:'8h',slides:[
    {bg:'photo-1524758631624-e2822e304c36',badge:'For Sale',title:'Study Desk In Good Condition',price:'35,000 RWF',unit:'',loc:'Near Campus'}]},
  marie:{name:'Marie',time:'1d',slides:[
    {bg:'photo-1544620347-c4fd4a3d5957',badge:'Transport Tip',title:'Getting To Campus Safely',price:'500 RWF',unit:'/ ride',loc:'Nyabugogo'}]}
};
