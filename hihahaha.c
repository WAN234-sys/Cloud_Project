/*
 * Copyright [2026] [WAN234]
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <windows.graphics.imaging.h>
#include <windows.h>
#include <conio.h>

/*font*/
  void setColor(int colorValue)
  {
    // 1=blue, 2=green, 4=Red, 7=White
     SetConsoleTextAttribute(GetStdHandle (STD_OUTPUT_HANDLE), colorValue);
  }

int main()
{
      /*Header*/
      setColor(4); //back to red
    char str[] = "-FILL TO REGISTER-";
   printf("\t %s \n", str);


  /*USERNAME*/
 setColor(2);
  char alp[20];
   char name[20]= "USERNAME:";
    printf("USERNAME:\n");
     setColor(7);
      scanf("%s", alp);


  /*PASSWORD*/
  setColor(2);
   char pass[13];
    while(1){
     printf("PASSWORD:\n");
      setColor(7);
       scanf("%12s", pass);


    if(strlen(pass)<8)
    {
     setColor(4);
     printf("insert more than 8 words or numbers\n\n");
    }
    else
    {
    setColor(7);
     printf("PASSWORD:%s\n", pass);
     break;
    }
  }
        /*DISPLAY*/
 setColor(2);
  printf("%s %s\n", name, alp);
   printf("PASSWORD:%s\n", pass);

  system("cls");
  /*GREET*/
  getchar();
  printf("WELCOME %s", alp);

 char ch;
  printf("                                                                                                                                                                                                                                                                                                                                                         *Just Press Enter Many Time To Close*\n");
  while(1)
  {
    ch = getch();
    if (ch == 13)
    {
      break;
    }
  }
 while(1)
  {
    ch = getch();
    if (ch == 13)
    {
      break;
    }
  }
  system("cls");
  printf("3");

  system("cls");

 while(1)
  {
    ch = getch();
    if (ch == 13)
    {
      break;
    }
  }
  printf("2");
  system("cls");

 while(1)
  {
    ch = getch();
    if (ch == 13)
    {
      break;
    }
  }
  printf("1");
  system("cls");
 while(1)
  {
    ch = getch();
    if (ch == 13)
    {
      break;
    }
  }
  return 0;
}

