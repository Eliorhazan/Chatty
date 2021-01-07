using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Web;
using System.Web.UI;
using System.Web.UI.WebControls;

public partial class Chatty : System.Web.UI.Page
{
    protected void Page_Load(object sender, EventArgs e)
    {


        var f = Request.Form;

        HttpFileCollection filesCollection = HttpContext.Current.Request.Files;

        var fileName = filesCollection[0];

        string filePath = Path.Combine(HttpContext.Current.Server.MapPath("~/data"), fileName.FileName);
        fileName.SaveAs(filePath);
    }


}